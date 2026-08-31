import {
  calculateFee,
  CURRENCY,
  needsCoach,
  OTHER_FACILITATOR,
} from "./config";
import { isWhatsAppPaused } from "./whatsapp";

/** Unambiguous alphabet — no O/0, I/1, so IDs survive being read over a phone. */
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * The letter that makes a registration ID say which category it belongs to.
 *
 * It sits early enough in the ID that a plain alphabetical sort groups the
 * two, and "IYF-Y" is a substring the admin search matches on its own — which
 * is the whole point of putting it there rather than only in a column.
 */
const TYPE_CODE = { youth: "Y", family: "F" };

/**
 * IYF-Y-2611-K7QM4P — category, year and month, then six random characters.
 *
 * IDs minted before this carried an "IPV-" prefix and no category letter.
 * They are still looked up by exact match, so they keep working; only new
 * registrations are numbered this way.
 */
export function generateOrderId(type, now = new Date()) {
  const code = TYPE_CODE[type];
  if (!code) throw new Error(`Invalid registration type: ${type}`);

  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let suffix = "";
  for (const byte of bytes) suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `IYF-${code}-${yy}${mm}-${suffix}`;
}

/**
 * Builds the document we persist. Every figure is derived here from the
 * category, coach and traveller count — the client never gets a say in the
 * price it is about to be charged.
 */
export function buildRegistrationDocument({
  type,
  coach,
  travellers,
  idProofFileIds,
  orderId,
  meta = {},
}) {
  const now = new Date();
  const withProofs = travellers.map((traveller, index) => ({
    ...traveller,
    idProofFileId: idProofFileIds[index],
  }));

  const travellerCount = withProofs.length;
  const seatClass = needsCoach(type) ? coach : null;
  const fee = calculateFee({ type, coach: seatClass, travellerCount });

  return {
    orderId,
    type,
    coach: seatClass,
    primary: withProofs[0],
    members: withProofs.slice(1),
    travellerCount,
    pricePerPerson: fee.perPerson,
    /* `amount` is what the gateway is charged, and today that is the advance
       only — every payment check downstream compares against this field, so it
       must stay the collected figure and not the full yatra fee. */
    amount: fee.advanceDue,
    fee: {
      perPerson: fee.perPerson,
      total: fee.total,
      advancePerPerson: fee.advancePerPerson,
      advanceDue: fee.advanceDue,
      balanceDue: fee.balanceDue,
    },
    currency: CURRENCY,
    payment: {
      status: "pending",
      provider: "ccavenue",
      trackingId: null,
      bankRefNo: null,
      paymentMode: null,
      failureMessage: null,
      paidAt: null,
      raw: null,
    },
    notifications: {
      confirmationSent: false,
      groupInviteSent: false,
      adminAlertSent: false,
      attempts: [],
    },
    meta,
    createdAt: now,
    updatedAt: now,
  };
}

/** Flattens a document into the shape the admin table and CSV both consume. */
export function toAdminRow(doc) {
  const all = [doc.primary, ...(doc.members || [])];
  return {
    orderId: doc.orderId,
    type: doc.type,
    coach: doc.coach || null,
    status: doc.payment?.status || "pending",
    amount: doc.amount,
    // Older rows predate the advance/balance split and only carry `amount`.
    totalFee: doc.fee?.total ?? doc.amount,
    balanceDue: doc.fee?.balanceDue ?? 0,
    travellerCount: doc.travellerCount ?? all.length,
    createdAt: doc.createdAt,
    trackingId: doc.payment?.trackingId || null,
    bankRefNo: doc.payment?.bankRefNo || null,
    paymentMode: doc.payment?.paymentMode || null,
    failureMessage: doc.payment?.failureMessage || null,
    // Surfaced so the coordinator can see at a glance who still needs to be
    // told by hand that their seat is confirmed.
    amountMismatch: Boolean(doc.payment?.amountMismatch),
    confirmationSent: Boolean(doc.notifications?.confirmationSent),
    // So the dashboard can say "paused" instead of "not sent" for every row
    // while WhatsApp is switched off.
    notificationsPaused: isWhatsAppPaused(),
    travellers: all.map((t) => ({
      name: t.name,
      email: t.email,
      phone: t.phone,
      whatsapp: t.whatsapp,
      /* "other" is a form value, not a person. The dashboard and the CSV both
         want the devotee the traveller actually named, with the number they
         gave alongside it — otherwise the coordinator reads "other" and has
         to open the raw document to find out who is meant. */
      facilitator:
        t.facilitator === OTHER_FACILITATOR
          ? t.facilitatorName || OTHER_FACILITATOR
          : t.facilitator,
      facilitatorContact:
        t.facilitator === OTHER_FACILITATOR ? t.facilitatorPhone || null : null,
      chantingRounds: t.chantingRounds,
      dob: t.dob,
      gender: t.gender,
      idProofFileId: t.idProofFileId ? String(t.idProofFileId) : null,
    })),
  };
}

/** One CSV line per traveller, so a 4-person family yields 4 rows. */
export function toCsvRows(doc) {
  const row = toAdminRow(doc);
  return row.travellers.map((traveller, index) => ({
    registration_id: row.orderId,
    category: row.type,
    coach_class: row.coach || "",
    member_role: index === 0 ? "primary" : `member_${index}`,
    name: traveller.name,
    email: traveller.email,
    contact_number: traveller.phone,
    whatsapp_number: traveller.whatsapp,
    facilitator: traveller.facilitator,
    facilitator_contact: traveller.facilitatorContact || "",
    chanting_rounds: traveller.chantingRounds,
    date_of_birth: traveller.dob,
    gender: traveller.gender,
    id_proof_uploaded: traveller.idProofFileId ? "yes" : "no",
    total_travellers: row.travellerCount,
    total_fee_inr: index === 0 ? row.totalFee : "",
    advance_paid_inr: index === 0 ? row.amount : "",
    balance_due_inr: index === 0 ? row.balanceDue : "",
    payment_status: row.status,
    tracking_id: row.trackingId || "",
    bank_ref_no: row.bankRefNo || "",
    payment_mode: row.paymentMode || "",
    whatsapp_confirmation: row.notificationsPaused
      ? "paused"
      : row.confirmationSent
        ? "sent"
        : "not_sent",
    registered_at: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : "",
  }));
}

export const CSV_COLUMNS = [
  "registration_id",
  "category",
  "coach_class",
  "member_role",
  "name",
  "email",
  "contact_number",
  "whatsapp_number",
  "facilitator",
  "facilitator_contact",
  "chanting_rounds",
  "date_of_birth",
  "gender",
  "id_proof_uploaded",
  "total_travellers",
  "total_fee_inr",
  "advance_paid_inr",
  "balance_due_inr",
  "payment_status",
  "tracking_id",
  "bank_ref_no",
  "payment_mode",
  "whatsapp_confirmation",
  "registered_at",
];
