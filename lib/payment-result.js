import { getRegistrations } from "./db";
import { sendAmountMismatchAlert, sendPaymentConfirmation } from "./notify";

/**
 * Writes a gateway outcome onto a registration, exactly once.
 *
 * Razorpay can deliver the same result more than once — the redirect POST,
 * the webhook, a customer refreshing that page, and later a reconciliation from
 * the admin dashboard can all describe the same payment. The conditional update below is
 * what makes that harmless: only the first writer that moves a registration
 * into "success" gets a document back, so only that one sends the WhatsApp
 * confirmation.
 */

/**
 * A confirmed payment must never be downgraded by a later message. Once money
 * is in, the only thing that can change the seat is a human in the admin
 * dashboard.
 */
const NOT_ALREADY_PAID = { "payment.status": { $ne: "success" } };

/** The customer's browser is mid-redirect, so WhatsApp gets a hard budget. */
const NOTIFY_BUDGET_MS = 12000;

function withBudget(promise, ms = NOTIFY_BUDGET_MS) {
  return Promise.race([
    promise.catch(() => null),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      timer.unref?.();
    }),
  ]);
}

/** Records the delivery outcome without ever failing the payment write. */
async function recordNotifications(orderId, patch) {
  if (!patch) return;
  const registrations = await getRegistrations();
  await registrations
    .updateOne(
      { orderId },
      {
        $set: {
          "notifications.confirmationSent": patch.confirmationSent,
          "notifications.groupInviteSent": patch.groupInviteSent,
          "notifications.adminAlertSent": patch.adminAlertSent,
          updatedAt: new Date(),
        },
        $push: { "notifications.attempts": { $each: patch.attempts || [] } },
      }
    )
    .catch((error) => console.error("[payment] notification record failed", error));
}

/**
 * Turns a settled gateway outcome into `payment.*` fields.
 *
 * `amountMismatch` implements every gateway guide's headline best practice:
 * never trust the amount and currency that come back — compare them with what
 * we recorded before the customer left for the gateway.
 *
 * Dotted paths rather than a whole `payment` object, so the Razorpay order ID
 * stored at initiation survives the write.
 */
function toPaymentUpdate(outcome, registration) {
  const status = outcome.status;
  const returnedAmount = Number(outcome.amount);
  const expectedAmount = Number(registration.amount);

  const amountMismatch =
    status === "success" &&
    (!Number.isFinite(returnedAmount) ||
      Math.abs(returnedAmount - expectedAmount) > 0.009 ||
      (outcome.currency || "INR") !== (registration.currency || "INR"));

  return {
    "payment.status": status,
    "payment.provider": outcome.provider || "razorpay",
    "payment.trackingId": outcome.trackingId || null,
    "payment.bankRefNo": outcome.bankRefNo || null,
    "payment.paymentMode": outcome.paymentMode || null,
    "payment.failureMessage": status === "success" ? null : outcome.failureMessage || null,
    "payment.paidAt": status === "success" ? new Date() : null,
    "payment.amountMismatch": amountMismatch,
    "payment.raw": outcome.raw ?? null,
  };
}

/**
 * Applies a settled gateway outcome (see `settlePayment` in ./razorpay):
 *   { orderId, lang?, status, amount, currency, provider, trackingId,
 *     bankRefNo, paymentMode, failureMessage, raw }
 *
 * `reconciled` marks a write made from the admin dashboard's status check.
 *
 * Returns { orderId, lang, status, changed } so the caller knows where to send
 * the browser, or null when the outcome does not name an order we hold.
 */
export async function recordPaymentOutcome(outcome, { reconciled = false } = {}) {
  const orderId = String(outcome?.orderId || "").trim();
  if (!orderId) return null;

  const registrations = await getRegistrations();
  const existing = await registrations.findOne({ orderId });
  if (!existing) return null;

  // The locale travels on the gateway order's notes, so it survives even when
  // the customer comes back in a fresh browser session.
  const lang =
    outcome.lang === "en" || outcome.lang === "hi"
      ? outcome.lang
      : existing.meta?.locale === "en"
        ? "en"
        : "hi";

  const current = existing.payment?.status || "pending";
  if (current === "success") {
    return { orderId, lang, status: "success", changed: false };
  }

  // A payment still in flight says nothing new; don't let it overwrite an
  // earlier attempt's failure message with blanks.
  if (outcome.status === "pending") {
    return { orderId, lang, status: current, changed: false };
  }

  const update = toPaymentUpdate(outcome, existing);
  if (reconciled) update["payment.reconciledAt"] = new Date();

  const updated = await registrations.findOneAndUpdate(
    { orderId, ...NOT_ALREADY_PAID },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  // Someone else won the race and marked it paid; they own the notifications.
  if (!updated) return { orderId, lang, status: "success", changed: false };

  if (outcome.status === "success") {
    const patch = await withBudget(sendPaymentConfirmation(updated, lang));
    await recordNotifications(orderId, patch);

    if (update["payment.amountMismatch"]) {
      console.error(
        `[payment] amount mismatch on ${orderId}: expected ${existing.amount} ${existing.currency}, gateway returned ${outcome.amount} ${outcome.currency}`
      );
      await withBudget(sendAmountMismatchAlert(updated, outcome), 5000);
    }
  }

  return { orderId, lang, status: outcome.status, changed: current !== outcome.status };
}
