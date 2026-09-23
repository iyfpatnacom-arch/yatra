import { getDb, getRegistrations } from "./db";

/**
 * The three switches the coordinators flip from the admin panel to stop new
 * bookings, kept in one document so a single read answers "can someone
 * register right now?".
 *
 *  - `open`       Planned closing. The form is replaced by a "registrations
 *                 closed" notice, but anyone already registered can still
 *                 finish paying for the seat they were promised.
 *  - `limit`      A cap on SEATS: travellers in paid registrations, so a
 *                 family of five takes five. A booking that would take the
 *                 count past it is refused, both when registering and when a
 *                 pending registration comes to pay, so the last seat cannot
 *                 be sold twice. `null` means no cap.
 *  - `killSwitch` The emergency stop. New registrations AND payments on
 *                 pending ones are refused at once, whatever the other two say.
 *
 * Lives in the database rather than an env var so it takes effect on the next
 * request, without a redeploy.
 */

const SETTINGS_ID = "registration";

export const MAX_REGISTRATION_LIMIT = 100000;

const DEFAULTS = { open: true, limit: null, killSwitch: false };

async function settingsCollection() {
  const db = await getDb();
  return db.collection("settings");
}

export async function getRegistrationSettings() {
  const settings = await settingsCollection();
  const doc = await settings.findOne({ _id: SETTINGS_ID });
  return {
    open: doc?.open ?? DEFAULTS.open,
    limit: Number.isInteger(doc?.limit) && doc.limit > 0 ? doc.limit : null,
    killSwitch: Boolean(doc?.killSwitch),
    updatedAt: doc?.updatedAt || null,
  };
}

/** Writes only the fields present in `changes`; the caller has validated them. */
export async function updateRegistrationSettings(changes) {
  const settings = await settingsCollection();
  await settings.updateOne(
    { _id: SETTINGS_ID },
    { $set: { ...changes, updatedAt: new Date() } },
    { upsert: true }
  );
  return getRegistrationSettings();
}

/** Seats the limit counts: every traveller in a paid registration. */
export async function countPaidSeats() {
  const registrations = await getRegistrations();
  const [result] = await registrations
    .aggregate([
      { $match: { "payment.status": "success" } },
      { $group: { _id: null, seats: { $sum: { $ifNull: ["$travellerCount", 1] } } } },
    ])
    .toArray();
  return result?.seats || 0;
}

/**
 * Whether a booking may go ahead, and if not why.
 *
 * `reason` is one of "stopped" (kill switch), "closed" or "full" — each shuts
 * the form for everyone — or "seats": some seats are left, but fewer than the
 * `travellers` in this booking, so a smaller one can still go ahead.
 *
 * `forPayment` is the pending registration settling its seat: a planned close
 * lets it through, because that person registered while the form was open.
 */
export async function registrationGate({ forPayment = false, travellers = 1 } = {}) {
  const settings = await getRegistrationSettings();

  if (settings.killSwitch) return { allowed: false, reason: "stopped", settings };
  if (!settings.open && !forPayment) {
    return { allowed: false, reason: "closed", settings };
  }

  if (settings.limit !== null) {
    const paid = await countPaidSeats();
    if (paid >= settings.limit) {
      return { allowed: false, reason: "full", settings, paid };
    }
    if (paid + travellers > settings.limit) {
      return { allowed: false, reason: "seats", settings, paid };
    }
  }

  return { allowed: true, reason: null, settings };
}

/** The error key each refusal is reported with, looked up in dict.errors. */
export const GATE_ERRORS = {
  stopped: "registrations_stopped",
  closed: "registrations_closed",
  full: "registrations_full",
  seats: "registrations_seats",
};

/**
 * The JSON body for a refusal. `closed` is only set when the form is shut for
 * everyone — that is what swaps the wizard for the "closed" notice. A booking
 * too big for the seats left gets a plain error instead.
 */
export function gateRefusal(reason) {
  return {
    ok: false,
    error: GATE_ERRORS[reason],
    ...(reason === "seats" ? {} : { closed: reason }),
  };
}
