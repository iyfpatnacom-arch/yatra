import { getRegistrations } from "./db";
import { toPaymentUpdate } from "./ccavenue";
import { sendAmountMismatchAlert, sendPaymentConfirmation } from "./notify";

/**
 * Writes a gateway outcome onto a registration, exactly once.
 *
 * CCAvenue can deliver the same result more than once — the redirect POST, a
 * customer refreshing that page, and later a reconciliation from the admin
 * dashboard can all describe the same payment. The conditional update below is
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
 * Applies a decrypted CCAvenue response.
 *
 * Returns { orderId, lang, status, changed } so the caller knows where to send
 * the browser, or null when the response does not name an order we hold.
 */
export async function recordGatewayResponse(response) {
  const orderId = String(response.order_id || response.orderNo || "").trim();
  if (!orderId) return null;

  const registrations = await getRegistrations();
  const existing = await registrations.findOne({ orderId });
  if (!existing) return null;

  // merchant_param3 is the locale we sent to the gateway, so it survives even
  // when the customer comes back in a fresh browser session.
  const lang =
    response.merchant_param3 === "en" || existing.meta?.locale === "en"
      ? "en"
      : "hi";

  if (existing.payment?.status === "success") {
    return { orderId, lang, status: "success", changed: false };
  }

  const update = toPaymentUpdate(response, existing);

  const updated = await registrations.findOneAndUpdate(
    { orderId, ...NOT_ALREADY_PAID },
    { $set: { payment: update, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  // Someone else won the race and marked it paid; they own the notifications.
  if (!updated) return { orderId, lang, status: "success", changed: false };

  if (update.status === "success") {
    const patch = await withBudget(sendPaymentConfirmation(updated, lang));
    await recordNotifications(orderId, patch);

    if (update.amountMismatch) {
      console.error(
        `[payment] amount mismatch on ${orderId}: expected ${existing.amount} ${existing.currency}, gateway returned ${response.amount} ${response.currency}`
      );
      await withBudget(sendAmountMismatchAlert(updated, response), 5000);
    }
  }

  return { orderId, lang, status: update.status, changed: true };
}

/**
 * Applies what the order status tracker says about an order whose result never
 * came back through the browser.
 *
 * Goes through the same one-writer-wins gate as the redirect handler, so a
 * reconciliation that discovers a lost payment sends the confirmation the
 * traveller never received — and a reconciliation of an order we already know
 * about sends nothing.
 */
export async function recordTrackerResult(orderId, tracker) {
  const registrations = await getRegistrations();
  const existing = await registrations.findOne({ orderId });
  if (!existing) return null;

  const current = existing.payment?.status || "pending";
  if (current === "success" || current === tracker.status) {
    return { orderId, status: current, changed: false };
  }

  const payment = {
    ...existing.payment,
    status: tracker.status,
    provider: "ccavenue",
    trackingId: tracker.trackingId || existing.payment?.trackingId || null,
    bankRefNo: tracker.bankRefNo || existing.payment?.bankRefNo || null,
    paymentMode: tracker.paymentMode || existing.payment?.paymentMode || null,
    failureMessage:
      tracker.status === "success" ? null : tracker.orderStatus || null,
    paidAt: tracker.status === "success" ? new Date() : null,
    amountMismatch:
      tracker.status === "success" &&
      Number.isFinite(tracker.amount) &&
      Math.abs(tracker.amount - Number(existing.amount)) > 0.009,
    reconciledAt: new Date(),
    raw: tracker.raw,
  };

  const updated = await registrations.findOneAndUpdate(
    { orderId, ...NOT_ALREADY_PAID },
    { $set: { payment, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (updated && tracker.status === "success") {
    const patch = await withBudget(sendPaymentConfirmation(updated));
    await recordNotifications(orderId, patch);
  }

  return { orderId, status: tracker.status, changed: Boolean(updated) };
}

/**
 * Marks an untouched registration as abandoned. Used by the cancel URL when
 * CCAvenue sends the customer back without an encrypted result to read.
 */
export async function recordAbandoned(orderId) {
  if (!orderId) return null;
  const registrations = await getRegistrations();

  await registrations.updateOne(
    { orderId, "payment.status": "pending" },
    {
      $set: {
        "payment.status": "aborted",
        "payment.failureMessage": "Cancelled by customer on the billing page.",
        updatedAt: new Date(),
      },
    }
  );

  return orderId;
}
