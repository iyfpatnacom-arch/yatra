import { NextResponse } from "next/server";
import {
  getRazorpayConfig,
  settlePayment,
  verifyWebhookSignature,
} from "@/lib/razorpay";
import { recordPaymentOutcome } from "@/lib/payment-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the backstop for a customer who pays and then closes the
 * tab, loses signal, or never makes it back from their UPI app. Without it
 * that seat stays "pending" until they press "pay now" again or a coordinator
 * checks it from the admin dashboard.
 *
 * Register {NEXT_PUBLIC_SITE_URL}/api/payment/webhook in the Razorpay
 * dashboard for payment.captured, payment.failed and order.paid, with the same
 * secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * Razorpay retries anything that is not a 2xx, and recordPaymentOutcome is
 * idempotent, so a failure here answers 500 and lets the retry try again.
 */
const EVENTS = new Set([
  "payment.captured",
  "payment.authorized",
  "payment.failed",
  "order.paid",
]);

export async function POST(request) {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature, config.webhookSecret)) {
    console.error("[payment] webhook with a bad signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const paymentId = event?.payload?.payment?.entity?.id;
  if (!EVENTS.has(event?.event) || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const outcome = await settlePayment(paymentId, config);
    // A payment for something this site did not create (another integration
    // on the same account, such as iyfpatna.in) is acknowledged and left alone.
    if (outcome) await recordPaymentOutcome(outcome);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[payment] webhook for ${paymentId} failed`, error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
