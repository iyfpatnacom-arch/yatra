import { NextResponse } from "next/server";
import { getRegistrations } from "@/lib/db";
import { buildPaymentRequest, getCcavenueConfig } from "@/lib/ccavenue";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Hands the browser everything it needs to POST itself to CCAvenue.
 *
 * Deliberately separate from /api/register: the same call powers "pay now"
 * from the status page, so a visitor whose card was declined or whose network
 * dropped can finish paying without registering all over again.
 *
 * The order id alone is enough to start a payment. That is safe — the worst a
 * stranger can do with someone else's id is pay for their yatra, and the
 * encrypted request exposes nothing back to them.
 */
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

  let config;
  try {
    config = getCcavenueConfig();
  } catch (error) {
    console.error("[payment] bad CCAvenue configuration", error);
    config = null;
  }
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
    {
      projection: {
        orderId: 1,
        type: 1,
        amount: 1,
        currency: 1,
        travellerCount: 1,
        "payment.status": 1,
        "primary.name": 1,
        "primary.email": 1,
        "primary.phone": 1,
      },
    }
  );

  if (!registration) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (registration.payment?.status === "success") {
    return NextResponse.json({ ok: false, error: "already_paid" }, { status: 409 });
  }

  try {
    const { action, fields } = buildPaymentRequest(registration, {
      lang: body?.lang === "en" ? "en" : "hi",
      config,
    });

    return NextResponse.json(
      { ok: true, action, fields },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[payment] could not build request", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
