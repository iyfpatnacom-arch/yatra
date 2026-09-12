/**
 * The unguessable half of a receipt link.
 *
 * Registration IDs became short and sequential (BRAJ-Y-101) so they can be
 * read down a helpline — which also means anyone can count. A receipt names
 * every traveller with their phone, email and date of birth, so an
 * unauthenticated /api/receipt/BRAJ-Y-101 would hand the whole manifest to
 * whoever walks the numbers.
 *
 * There is no login to check against, so the link itself carries the proof:
 * ten hex characters of HMAC over the registration ID. Forty bits is far more
 * than anyone brute-forces through a rate-limited endpoint, and it is derived
 * rather than stored, so no column has to hold it and it survives a restore.
 *
 * Web Crypto rather than node:crypto, matching lib/admin-session.js, so this
 * runs unchanged wherever Next decides to put it.
 */

const TOKEN_LENGTH = 10;

function getSecret() {
  const secret = process.env.RECEIPT_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "RECEIPT_SECRET (or ADMIN_SESSION_SECRET) must be a random string of at least 16 characters."
    );
  }
  return secret;
}

export async function receiptToken(orderId) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`receipt:${orderId}`)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, TOKEN_LENGTH);
}

/** Length-safe, branch-free compare, so a wrong token leaks no timing signal. */
export async function verifyReceiptToken(orderId, candidate) {
  const expected = await receiptToken(orderId);
  const given = String(candidate || "");
  if (given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * The absolute link. Absolute because WhatsApp hands it to Meta, which fetches
 * the PDF from the public internet — a relative path would never resolve.
 */
export async function receiptUrl(orderId, origin = process.env.NEXT_PUBLIC_SITE_URL) {
  const token = await receiptToken(orderId);
  const base = String(origin || "").replace(/\/+$/, "");
  return `${base}/api/receipt/${encodeURIComponent(orderId)}?t=${token}`;
}
