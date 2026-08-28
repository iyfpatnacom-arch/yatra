import { NextResponse } from "next/server";
import { getCcavenueConfig, parseGatewayResponse } from "@/lib/ccavenue";
import { recordAbandoned, recordGatewayResponse } from "@/lib/payment-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CCAvenue's cancel_url — where the customer lands after backing out of the
 * billing page.
 *
 * What arrives here varies by merchant configuration: sometimes a full
 * encrypted result with order_status "Aborted", sometimes just the order
 * number. Both are handled, and either way the registration is left intact so
 * the visitor can pay later from their status page.
 */

function backToStatus(request, lang = "hi", orderId = null) {
  const base = getCcavenueConfig()?.siteUrl || request.nextUrl.origin;
  const path = orderId
    ? `/${lang}/status/${encodeURIComponent(orderId)}`
    : `/${lang}`;
  return NextResponse.redirect(new URL(path, base), 303);
}

async function handle(request, encResp, plainOrderId) {
  const config = getCcavenueConfig();

  if (config && encResp) {
    try {
      const response = parseGatewayResponse(encResp, config);
      const result = await recordGatewayResponse(response);
      if (result) return backToStatus(request, result.lang, result.orderId);
    } catch (error) {
      console.error("[payment] could not read cancel response", error);
    }
  }

  const orderId = String(plainOrderId || "").trim();
  if (orderId) {
    await recordAbandoned(orderId).catch((error) =>
      console.error("[payment] could not mark order abandoned", error)
    );
    return backToStatus(request, "hi", orderId);
  }

  return backToStatus(request);
}

export async function POST(request) {
  let encResp = null;
  let orderId = null;
  try {
    const form = await request.formData();
    encResp = form.get("encResp");
    orderId = form.get("order_id") || form.get("orderNo");
  } catch (error) {
    console.error("[payment] unreadable cancel body", error);
  }
  return handle(request, encResp, orderId);
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  return handle(
    request,
    params.get("encResp"),
    params.get("order_id") || params.get("orderNo")
  );
}
