import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/require-admin";
import { getRegistrations } from "@/lib/db";
import { getRazorpayConfig, settleOrder } from "@/lib/razorpay";
import { recordPaymentOutcome } from "@/lib/payment-result";

export const runtime = "nodejs";

/**
 * Asks Razorpay what actually happened to one registration and writes the
 * answer back.
 *
 * This is the fix for the row that says "pending" because the customer's phone
 * died mid-UPI and the webhook never landed. The money either moved or it did
 * not, and only Razorpay knows; the coordinator should never have to decide by
 * eye.
 */
export async function POST(request) {
  if (!(await isAdmin())) return unauthorized();

  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "payment_unavailable" },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 400 });
  }

  const orderId = String(body?.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
  }

  const registrations = await getRegistrations();
  const registration = await registrations.findOne(
    { orderId },
    { projection: { "payment.status": 1, "payment.gatewayOrderId": 1 } }
  );
  if (!registration) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const current = registration.payment?.status || "pending";
  const gatewayOrderId = registration.payment?.gatewayOrderId;

  // Never reached the checkout, so Razorpay has nothing to say about it.
  if (!gatewayOrderId) {
    return NextResponse.json({ ok: true, status: current, changed: false });
  }

  try {
    const outcome = await settleOrder(gatewayOrderId, config);
    if (!outcome) {
      return NextResponse.json({ ok: true, status: current, changed: false });
    }

    const result = await recordPaymentOutcome(outcome, { reconciled: true });
    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      changed: result.changed,
      orderStatus: outcome.raw?.payment?.status || null,
    });
  } catch (error) {
    console.error("[reconcile] failed", error);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(error.message || error) },
      { status: 502 }
    );
  }
}
