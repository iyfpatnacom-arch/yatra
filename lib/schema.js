import { z } from "zod";
import {
  COACH_CLASSES,
  GENDER_OPTIONS,
  MAX_MEMBERS,
  REGISTRATION_TYPES,
} from "./config";

/**
 * Validation messages are KEYS, not sentences. The UI looks each key up in the
 * active dictionary (lib/i18n) so a Hindi visitor gets Hindi errors from the
 * exact same schema the server validates with.
 */

/** Strips spaces, dashes and a leading +91/0 so "+91 98765-43210" -> "9876543210". */
export function normalizePhone(value) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const indianMobile = (requiredKey, invalidKey) =>
  z
    .preprocess(
      (v) => normalizePhone(v),
      z
        .string({ error: requiredKey })
        .min(1, requiredKey)
        .regex(/^[6-9]\d{9}$/, invalidKey)
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
  name: z
    .string({ error: "name_required" })
    .trim()
    .min(2, "name_required")
    .max(80, "name_too_long"),
  email: z
    .string({ error: "email_required" })
    .trim()
    .min(1, "email_required")
    .pipe(z.email("email_invalid"))
    .transform((v) => v.toLowerCase()),
  phone: indianMobile("phone_required", "phone_invalid"),
  whatsapp: indianMobile("whatsapp_required", "whatsapp_invalid"),
  facilitator: z
    .string({ error: "facilitator_required" })
    .trim()
    .min(2, "facilitator_required")
    .max(80, "facilitator_too_long"),
  chantingRounds: z.coerce
    .number({ error: "rounds_required" })
    .int("rounds_invalid")
    .min(0, "rounds_invalid")
    .max(64, "rounds_max"),
  dob: dateOfBirth,
  gender: z.enum(GENDER_OPTIONS, { error: "gender_required" }),
});

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
  .refine((data) => data.type !== "family" || Boolean(data.coach), {
    error: "coach_required",
    path: ["coach"],
  });

/** Blank traveller used to seed the form and each "add member" row. */
export const emptyTraveller = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  facilitator: "",
  chantingRounds: "",
  dob: "",
  gender: "",
  idProof: null,
};

export const adminLoginSchema = z.object({
  password: z.string().min(1, "password_required"),
});
