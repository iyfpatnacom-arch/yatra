import { NextResponse } from "next/server";
import {
  getRazorpayConfig,
  settlePayment,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import { recordPaymentOutcome } from "@/lib/payment-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay checkout's callback_url.
 *
 * The customer's browser arrives here as a cross-site POST. Nothing about this
 * request is authenticated by a cookie — it cannot be, the customer may be
 * returning from a UPI app in a different browser session entirely.
 *
 * On success the body carries razorpay_payment_id, razorpay_order_id and
 * razorpay_signature; on failure it carries error[…] fields with the IDs in
 * error[metadata]. Neither is trusted as-is: the signature is checked where
 * there is one, and the outcome itself is always re-read from Razorpay's API.
 */

function backToStatus(request, lang = "hi", orderId = null) {
  const base = getRazorpayConfig()?.siteUrl || request.nextUrl.origin;
  const path = orderId
    ? `/${lang}/status/${encodeURIComponent(orderId)}`
    : `/${lang}`;
  // 303 so the browser follows with GET instead of re-POSTing the payload.
  return NextResponse.redirect(new URL(path, base), 303);
}

function paymentIdFrom(form) {
  const paymentId = form.get("razorpay_payment_id");
  if (paymentId) {
    return {
      paymentId: String(paymentId),
      orderId: String(form.get("razorpay_order_id") || ""),
      signature: String(form.get("razorpay_signature") || ""),
    };
  }

  try {
    const metadata = JSON.parse(String(form.get("error[metadata]") || "{}"));
    if (metadata.payment_id) {
      return { paymentId: String(metadata.payment_id), failed: true };
    }
  } catch {
    /* No usable metadata — nothing to settle. */
  }
  return null;
}

export async function POST(request) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "hi";

  const config = getRazorpayConfig();
  if (!config) {
    console.error("[payment] response received while Razorpay is unconfigured");
    return backToStatus(request, lang);
  }

  let ids = null;
  try {
    ids = paymentIdFrom(await request.formData());
  } catch (error) {
    console.error("[payment] unreadable response body", error);
  }
  if (!ids) {
    console.error("[payment] response named no payment");
    return backToStatus(request, lang);
  }

  if (!ids.failed && !verifyCheckoutSignature(ids, config)) {
    console.error(`[payment] bad checkout signature for ${ids.paymentId}`);
    return backToStatus(request, lang);
  }

  let outcome = null;
  try {
    outcome = await settlePayment(ids.paymentId, config);
    if (!outcome) {
      console.error(`[payment] ${ids.paymentId} is not for an order we created`);
      return backToStatus(request, lang);
    }
    const result = await recordPaymentOutcome({ ...outcome, lang });
    return backToStatus(
      request,
      result?.lang || lang,
      result?.orderId || outcome.orderId
    );
  } catch (error) {
    // The payment itself may well have succeeded, so the customer still goes
    // to their status page; the webhook or "pay now" reconciles the row.
    console.error("[payment] failed to record response", error);
    return backToStatus(request, lang, outcome?.orderId || null);
  }
}

/** A customer who lands here by hand (a bookmark, the back button). */
export async function GET(request) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "hi";
  return backToStatus(request, lang);
}
