import { NextResponse } from "next/server";
import { getRegistrations } from "@/lib/db";
import {
  buildCheckoutOptions,
  createOrder,
  fetchOrder,
  getRazorpayConfig,
  settleOrder,
  toPaise,
} from "@/lib/razorpay";
import { recordPaymentOutcome } from "@/lib/payment-result";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Hands the browser everything it needs to open Razorpay's checkout.
 *
 * Deliberately separate from /api/register: the same call powers "pay now"
 * from the status page, so a visitor whose card was declined or whose network
 * dropped can finish paying without registering all over again.
 *
 * The order id alone is enough to start a payment. That is safe — the worst a
 * stranger can do with someone else's id is pay for their yatra, and the
 * checkout options expose nothing beyond what that person typed in.
 *
 * The Razorpay Order is created once per registration and reused on every
 * retry. That is what stops a double charge: if the customer paid but the
 * redirect never reached us, "pay now" finds the order already paid, records
 * it and sends them to their status page instead of opening a second checkout.
 */
async function gatewayOrderFor(registration, { lang, config }) {
  const stored = registration.payment || {};
  const amount = toPaise(registration.amount);

  if (stored.gatewayOrderId && stored.gatewayAmount === amount) {
    const order = await fetchOrder(config, stored.gatewayOrderId);
    if (order.status !== "paid") return { order };

    const outcome = await settleOrder(order.id, config);
    if (outcome) await recordPaymentOutcome({ ...outcome, lang });
    // Paid on Razorpay's side: never open a second checkout. If nothing was
    // capturable the status page stays pending for a human to reconcile.
    return { paid: true };
  }

  // First attempt, or the price changed since: a fresh order.
  const order = await createOrder(registration, { lang, config });
  const registrations = await getRegistrations();
  await registrations.updateOne(
    { orderId: registration.orderId },
    {
      $set: {
        "payment.provider": "razorpay",
        "payment.gatewayOrderId": order.id,
        "payment.gatewayAmount": order.amount,
        updatedAt: new Date(),
      },
    }
  );
  return { order };
}

export async function POST(request) {
  const limit = check(clientKey(request, "payment"), {
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

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
  const lang = body?.lang === "en" ? "en" : "hi";
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 400 });
  }

  const registrations = await getRegistrations();
  const registration = await registrations.findOne(
    { orderId },
    {
      projection: {
        orderId: 1,
        type: 1,
        amount: 1,
        currency: 1,
        travellerCount: 1,
        "payment.status": 1,
        "payment.gatewayOrderId": 1,
        "payment.gatewayAmount": 1,
        "primary.name": 1,
        "primary.email": 1,
        "primary.phone": 1,
      },
    }
  );

  if (!registration) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const statusPath = `/${lang}/status/${encodeURIComponent(orderId)}`;

  // Already paid (a second tab, a double tap) — straight to the status page.
  if (registration.payment?.status === "success") {
    return NextResponse.json({ ok: true, redirect: statusPath });
  }

  try {
    const { order, paid } = await gatewayOrderFor(registration, { lang, config });
    if (paid) return NextResponse.json({ ok: true, redirect: statusPath });

    return NextResponse.json(
      { ok: true, checkout: buildCheckoutOptions(registration, order, { lang, config }) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[payment] could not prepare checkout", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
