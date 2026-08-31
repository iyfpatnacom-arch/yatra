import { z } from "zod";
import {
  CHANTING_ROUNDS_MAX,
  CHANTING_ROUNDS_MIN,
  COACH_CLASSES,
  GENDER_OPTIONS,
  MAX_MEMBERS,
  OTHER_FACILITATOR,
  REGISTRATION_TYPES,
  facilitatorOptionsFor,
  genderOptionsFor,
} from "./config";

/**
 * Validation messages are KEYS, not sentences. The UI looks each key up in the
 * active dictionary (lib/i18n) so a Hindi visitor gets Hindi errors from the
 * exact same schema the server validates with.
 *
 * Every rule here is deliberately narrow: this list is read off a printed
 * manifest at the station, so a name with a digit in it or a number nobody can
 * ring is worse than a rejected form. The browser stops most of this at the
 * keystroke (lib/input-filters), but a payload posted straight at the API
 * meets the same rules here.
 */

/** Strips spaces, dashes and a leading +91/0 so "+91 98765-43210" -> "9876543210". */
export function normalizePhone(value) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/**
 * Letters of any script — a Hindi visitor types Devanagari — plus the spaces,
 * dots, apostrophes and hyphens real names carry. Digits, symbols and emoji
 * are exactly what this exists to reject.
 */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

const personName = (requiredKey, invalidKey, tooLongKey) =>
  z
    .string({ error: requiredKey })
    // Runs of spaces collapse so "Radhika   Sharma" is stored the one way.
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, requiredKey)
        .max(80, tooLongKey)
        .regex(NAME_PATTERN, invalidKey)
        // "A." or "K" is a typo, not a name.
        .refine((value) => (value.match(/\p{L}/gu) || []).length >= 2, invalidKey)
    );

const indianMobile = (requiredKey, invalidKey) =>
  z
    .string({ error: requiredKey })
    .trim()
    .min(1, requiredKey)
    /* Rejected rather than stripped: silently throwing away the letters in
       "call 9876543210" would save a number the visitor never confirmed. */
    .regex(/^\+?[\d\s()-]+$/, invalidKey)
    .transform(normalizePhone)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, invalidKey));

const emailAddress = z
  .string({ error: "email_required" })
  .trim()
  .min(1, "email_required")
  .max(254, "email_too_long")
  .transform((value) => value.toLowerCase())
  .pipe(z.email("email_invalid"))
  /* zod accepts "devotee@localhost"; a receipt only reaches a dotted domain
     with a real letter TLD, and consecutive dots are always a typo. */
  .pipe(
    z
      .string()
      .regex(/^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)*\.[A-Za-z]{2,}$/, "email_invalid")
      .refine((value) => !value.includes(".."), "email_invalid")
  );

/**
 * Rounds arrive as a string from the form and as a number from a re-posted
 * payload. An entry that is not a whole number becomes -1 so it fails the
 * range check with "rounds_invalid", rather than raising a type error the
 * dictionary has no sentence for.
 */
const chantingRounds = z.preprocess(
  (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (text === "") return undefined;
    return /^\d{1,3}$/.test(text) ? Number(text) : -1;
  },
  z
    .number({ error: "rounds_required" })
    .int("rounds_invalid")
    .min(CHANTING_ROUNDS_MIN, "rounds_invalid")
    .max(CHANTING_ROUNDS_MAX, "rounds_max")
);

const dateOfBirth = z
  .string({ error: "dob_required" })
  .min(1, "dob_required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dob_invalid")
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    // Guards against calendar-invalid input like 2001-02-31, which Date rolls over.
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, "dob_invalid")
  .refine((value) => new Date(`${value}T00:00:00Z`) < new Date(), "dob_future")
  .refine((value) => {
    const years =
      (Date.now() - new Date(`${value}T00:00:00Z`).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return years >= 1 && years <= 110;
  }, "dob_range");

export const travellerSchema = z.object({
  name: personName("name_required", "name_invalid", "name_too_long"),
  email: emailAddress,
  phone: indianMobile("phone_required", "phone_invalid"),
  whatsapp: indianMobile("whatsapp_required", "whatsapp_invalid"),
  /* A value off the category's list, or OTHER_FACILITATOR. Which list applies
     depends on the booking's category, so membership is checked by
     `checkFacilitators` below rather than here. */
  facilitator: z
    .string({ error: "facilitator_required" })
    .trim()
    .min(1, "facilitator_required"),
  /* Only read when `facilitator` is "other"; the same check requires them. */
  facilitatorName: z.string().optional(),
  facilitatorPhone: z.string().optional(),
  chantingRounds,
  dob: dateOfBirth,
  gender: z.enum(GENDER_OPTIONS, { error: "gender_required" }),
});

/* An "Other" facilitator is held to the same rules as a traveller: a real
   name, and a number the coordinator can actually ring. */
const otherFacilitatorName = personName(
  "facilitator_name_required",
  "facilitator_name_invalid",
  "facilitator_name_too_long"
);
const otherFacilitatorPhone = indianMobile(
  "facilitator_phone_required",
  "facilitator_phone_invalid"
);

/**
 * The facilitator rules that have to see the whole booking: which list the
 * chosen category offers, and the extra details "Other" asks for.
 *
 * Exported as a bare superRefine because the wizard builds its own schema to
 * add the ID photo — running the very same function there is what stops the
 * browser and the server drifting apart on who may be picked.
 */
export function checkFacilitators(data, ctx) {
  const allowed = facilitatorOptionsFor(data.type);

  (data.travellers || []).forEach((traveller, index) => {
    const at = (field) => ["travellers", index, field];

    if (!allowed.includes(traveller.facilitator)) {
      ctx.addIssue({
        code: "custom",
        message: "facilitator_required",
        path: at("facilitator"),
      });
      return;
    }

    if (traveller.facilitator !== OTHER_FACILITATOR) return;

    const name = otherFacilitatorName.safeParse(traveller.facilitatorName);
    if (!name.success) {
      ctx.addIssue({
        code: "custom",
        message: name.error.issues[0].message,
        path: at("facilitatorName"),
      });
    }

    const phone = otherFacilitatorPhone.safeParse(traveller.facilitatorPhone);
    if (!phone.success) {
      ctx.addIssue({
        code: "custom",
        message: phone.error.issues[0].message,
        path: at("facilitatorPhone"),
      });
    }
  });
}

export const registrationSchema = z
  .object({
    type: z.enum(REGISTRATION_TYPES, { error: "type_required" }),
    /* Only a family booking has a coach to choose; the youth fee is flat, so
       the field is optional here and pinned by the refine below. */
    coach: z.enum(COACH_CLASSES, { error: "coach_required" }).optional(),
    travellers: z
      .array(travellerSchema)
      .min(1, "travellers_min")
      .max(MAX_MEMBERS, "travellers_max"),
  })
  .refine(
    (data) => data.type !== "youth" || data.travellers.length === 1,
    { error: "youth_single_only", path: ["travellers"] }
  )
  .refine(
    (data) =>
      data.type !== "youth" ||
      data.travellers.every((traveller) => traveller.gender === "male"),
    { error: "youth_male_only", path: ["travellers", 0, "gender"] }
  )
  .refine((data) => data.type !== "family" || Boolean(data.coach), {
    error: "coach_required",
    path: ["coach"],
  })
  .superRefine(checkFacilitators)
  /* Nothing is stored for a facilitator picked off the list, so a visitor who
     typed a name, changed their mind and picked one does not leave a stray
     contact behind on the row. */
  .transform((data) => ({
    ...data,
    travellers: data.travellers.map((traveller) => {
      const { facilitatorName, facilitatorPhone, ...rest } = traveller;
      if (traveller.facilitator !== OTHER_FACILITATOR) return rest;
      return {
        ...rest,
        facilitatorName: String(facilitatorName).replace(/\s+/g, " ").trim(),
        facilitatorPhone: normalizePhone(facilitatorPhone),
      };
    }),
  }));

/** Blank traveller used to seed the form and each "add member" row. */
export const emptyTraveller = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  facilitator: "",
  facilitatorName: "",
  facilitatorPhone: "",
  chantingRounds: "",
  dob: "",
  gender: "",
  idProof: null,
};

/**
 * A fresh traveller row for `type`.
 *
 * The youth category is open to male devotees only, so its single legal answer
 * is filled in rather than asked for — the form shows it locked instead of
 * offering a choice that can only be wrong.
 */
export function newTraveller(type) {
  const genders = genderOptionsFor(type);
  return { ...emptyTraveller, gender: genders.length === 1 ? genders[0] : "" };
}

export const adminLoginSchema = z.object({
  password: z.string().min(1, "password_required"),
});
