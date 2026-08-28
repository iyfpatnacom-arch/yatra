import { getCcavenueConfig, encrypt, decrypt } from "./ccavenue";

/**
 * CCAvenue server-to-server API (the "DoWebTrans" calls).
 *
 * Only needed for the case the browser redirect cannot cover: the customer
 * paid, but the response never reached /api/payment/response — closed laptop,
 * dead mobile connection, a timeout on CCAvenue's side. The order then sits at
 * "Awaited" on their system and "pending" on ours, and the Status API is the
 * documented way to find out which.
 *
 * NOTE: these calls are IP-whitelisted. The public IP of wherever this app
 * runs has to be registered with CCAvenue under Settings → API Keys, or every
 * call comes back 51407 "You are not allowed to perform this operation".
 */

const API_HOSTS = {
  test: "https://apitest.ccavenue.com/apis/servlet/DoWebTrans",
  production: "https://api.ccavenue.com/apis/servlet/DoWebTrans",
};

const API_VERSION = "1.1";

function apiEndpoint(config) {
  return (
    (process.env.CCAVENUE_API_URL || "").trim() || API_HOSTS[config.environment]
  );
}

/**
 * Runs one API command and returns the decrypted JSON payload.
 *
 * Every documented command rides on this — orderStatusTracker, refundOrder,
 * cancelOrder, confirmOrder, orderLookup — they differ only in `command` and
 * the shape of `payload`.
 */
export async function ccavenueApi(command, payload, { timeoutMs = 15000 } = {}) {
  const config = getCcavenueConfig();
  if (!config) throw new Error("CCAvenue is not configured.");

  const body = new URLSearchParams({
    enc_request: encrypt(JSON.stringify(payload), config.workingKey, config.mode),
    access_code: config.accessCode,
    command,
    request_type: "JSON",
    response_type: "JSON",
    version: API_VERSION,
  });

  const response = await fetch(apiEndpoint(config), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CCAvenue API returned HTTP ${response.status}`);
  }

  // The reply is itself a query string: status=0&enc_response=<hex>
  const parsed = new URLSearchParams(await response.text());
  const status = parsed.get("status");
  const encResponse = parsed.get("enc_response") || "";

  // status=1 means the failure happened before encryption, so enc_response is
  // readable plain text rather than ciphertext.
  if (status === "1") {
    throw new Error(
      `CCAvenue API error ${parsed.get("enc_error_code") || ""}: ${encResponse}`.trim()
    );
  }

  return JSON.parse(decrypt(encResponse, config.workingKey, config.mode));
}

/**
 * The order status tracker's vocabulary is wider than the four statuses this
 * app stores, so anything that is not money-in-hand collapses to failed. The
 * original CCAvenue wording is kept in `failureMessage` so the coordinator can
 * still tell a refund from a chargeback.
 */
export function mapTrackerStatus(orderStatus) {
  switch (String(orderStatus || "").trim().toLowerCase()) {
    case "successful":
    case "success":
    case "shipped":
      return "success";
    case "initiated":
    case "awaited":
      return "pending";
    case "aborted":
      return "aborted";
    default:
      return "failed";
  }
}

/** Asks CCAvenue what really happened to one order. */
export async function getOrderStatus({ orderId, referenceNo }) {
  const result = await ccavenueApi("orderStatusTracker", {
    order_no: orderId || "",
    reference_no: referenceNo || "",
  });

  if (result.status === 1 || result.error_code) {
    throw new Error(
      `CCAvenue status lookup failed ${result.error_code || ""}: ${result.error_desc || "unknown"}`.trim()
    );
  }

  return {
    status: mapTrackerStatus(result.order_status),
    orderStatus: result.order_status || null,
    trackingId: result.reference_no ? String(result.reference_no) : null,
    bankRefNo: result.order_bank_ref_no || null,
    paymentMode: result.order_option_type || null,
    amount: Number(result.order_amt),
    currency: result.order_currncy || result.order_curr || null,
    raw: result,
  };
}
