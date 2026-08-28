import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/require-admin";
import { isPaymentConfigured } from "@/lib/ccavenue";
import { getOrderStatus } from "@/lib/ccavenue-api";
import { recordTrackerResult } from "@/lib/payment-result";

export const runtime = "nodejs";

/**
 * Asks CCAvenue what actually happened to one order and writes the answer back.
 *
 * This is the fix for the row that says "pending" because the customer's phone
 * died on the bank's 3-D Secure page. The money either moved or it did not, and
 * only CCAvenue knows; the coordinator should never have to decide by eye.
 */
export async function POST(request) {
  if (!(await isAdmin())) return unauthorized();

  if (!isPaymentConfigured()) {
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

  try {
    const tracker = await getOrderStatus({ orderId });
    const result = await recordTrackerResult(orderId, tracker);

    if (!result) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      changed: result.changed,
      orderStatus: tracker.orderStatus,
    });
  } catch (error) {
    console.error("[reconcile] failed", error);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(error.message || error) },
      { status: 502 }
    );
  }
}
