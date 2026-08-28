/**
 * Single source of truth for trip pricing and public trip details.
 *
 * Everything here is read on the SERVER when money is involved. The client
 * gets a copy for display only — `calculateFee` is re-run server-side on every
 * registration so a tampered client payload can never change the price.
 *
 * The money constants are deliberately NEXT_PUBLIC_: the fee summary is a
 * client component, and a server-only variable is inlined as `undefined` in
 * that bundle, which would quietly show the visitor a different number from
 * the one they are charged.
 */

function money(value, fallback) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

export const CURRENCY = "INR";

export const REGISTRATION_TYPES = ["youth", "family"];

/** Train coach a family travels in — the only thing that moves their fee. */
export const COACH_CLASSES = ["sleeper", "ac"];

export const DEFAULT_COACH = "sleeper";

/** Full yatra fee per traveller. */
export const FEES = {
  youth: money(process.env.NEXT_PUBLIC_FEE_YOUTH, 5100),
  family: {
    sleeper: money(process.env.NEXT_PUBLIC_FEE_FAMILY_SLEEPER, 8000),
    ac: money(process.env.NEXT_PUBLIC_FEE_FAMILY_AC, 10000),
  },
};

/**
 * What is collected online today. The balance is settled with the coordinator
 * closer to departure, so the gateway is only ever asked for this much — every
 * traveller pays the same advance whatever category they booked.
 */
export const ADVANCE_PER_PERSON = money(
  process.env.NEXT_PUBLIC_ADVANCE_PER_PERSON,
  2000
);

/** Hard cap on travellers in a single family/couple booking. */
export const MAX_MEMBERS = 10;

/** Max accepted size of an uploaded ID photo, after client-side compression. */
export const MAX_ID_PROOF_BYTES = 3 * 1024 * 1024;

export const ACCEPTED_ID_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/** Only families pick a coach; a youth booking has a single flat fee. */
export function needsCoach(type) {
  return type === "family";
}

export function feePerPerson(type, coach) {
  if (!needsCoach(type)) return FEES.youth;
  return FEES.family[COACH_CLASSES.includes(coach) ? coach : DEFAULT_COACH];
}

/**
 * The whole money picture for one booking.
 *
 * `advanceDue` is what the payment gateway is asked for; `balanceDue` is what
 * the traveller still owes the coordinator before departure.
 */
export function calculateFee({ type, coach, travellerCount }) {
  if (!REGISTRATION_TYPES.includes(type)) {
    throw new Error(`Invalid registration type: ${type}`);
  }
  const n = Number(travellerCount);
  if (!Number.isInteger(n) || n < 1 || n > MAX_MEMBERS) {
    throw new Error(`Invalid traveller count: ${travellerCount}`);
  }

  const perPerson = feePerPerson(type, coach);
  // A test-sized advance must never exceed the fee it is an advance on.
  const advancePerPerson = Math.min(ADVANCE_PER_PERSON, perPerson);

  return {
    perPerson,
    total: perPerson * n,
    advancePerPerson,
    advanceDue: advancePerPerson * n,
    balanceDue: (perPerson - advancePerPerson) * n,
  };
}

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Public trip details rendered on the landing page.
 * Edit these — they are intentionally not in the database.
 */
export const TRIP = {
  departureCity: { hi: "पटना", en: "Patna" },
  destination: { hi: "वृन्दावन धाम", en: "Vrindavan Dham" },
  startDate: process.env.NEXT_PUBLIC_TRIP_START || "2026-11-06",
  endDate: process.env.NEXT_PUBLIC_TRIP_END || "2026-11-09",
  /** Departure time, used by the countdown. Local IST, 24-hour. */
  departureTime: process.env.NEXT_PUBLIC_TRIP_DEPART_TIME || "06:00",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 00000 00000",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "yatra@iskconpatna.org",
};

/**
 * Hero carousel slides, in the order the yatra visits them.
 *
 * Files live in /public/hero. A slide with `src: null` renders as an
 * ornamental panel instead of a broken image, which is what keeps the hero
 * presentable if one is ever removed. An absolute https URL also works, so
 * long as its host is allowed in next.config.mjs.
 *
 * Licences differ per file — see public/hero/CREDITS.md before swapping or
 * reusing any of them.
 */
export const HERO_SLIDES = [
  { src: "/hero/vrindavan.jpg", captionKey: "vrindavan" },
  { src: "/hero/govardhan.jpg", captionKey: "govardhan" },
  { src: "/hero/gokul.jpg", captionKey: "gokul" },
  { src: "/hero/nandgaon.jpg", captionKey: "nandgaon" },
  { src: "/hero/barsana.jpg", captionKey: "barsana" },
];

export const GENDER_OPTIONS = ["male", "female", "other"];

export const PAYMENT_STATUSES = ["pending", "success", "failed", "aborted"];
