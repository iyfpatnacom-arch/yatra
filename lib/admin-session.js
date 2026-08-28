/**
 * Admin session = an HMAC-signed, httpOnly cookie. No database row, no JWT
 * library. Built on Web Crypto so the exact same module runs in the Node
 * route handlers and in proxy.js.
 *
 * Cookie value: "<expiresAtMs>.<base64url(HMAC-SHA256(expiresAtMs))>"
 */

export const ADMIN_COOKIE = "yatra_admin";

/** 12 hours — long enough for a working session, short enough to matter. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a random string of at least 16 characters."
    );
  }
  return secret;
}

function toBase64Url(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(now = Date.now()) {
  const expiresAt = String(now + SESSION_TTL_MS);
  const key = await importKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(expiresAt)
  );
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token) {
  if (typeof token !== "string") return false;
  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(expiresAt) || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;

  try {
    const key = await importKey();
    // subtle.verify is constant-time, so this does not leak the signature.
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(expiresAt)
    );
  } catch {
    return false;
  }
}

/** Constant-time string comparison for the admin password check. */
export function safeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  // Length is compared separately; the loop below always runs the same number
  // of iterations for a given input so it cannot be used as a timing oracle.
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
