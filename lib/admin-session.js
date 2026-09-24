/**
 * Admin session = an HMAC-signed, httpOnly cookie. No database row, no JWT
 * library. Built on Web Crypto so the exact same module runs in the Node
 * route handlers and in proxy.js.
 *
 * Cookie value: "<expiresAtMs>.<base64url(HMAC-SHA256(expiresAtMs))>"
 */

export const ADMIN_COOKIE = "yatra_admin";

/**
 * A second cookie, issued only against MASTER_ADMIN_PASSWORD, that unlocks the
 * registration controls. Every coordinator shares the admin password, and
 * closing the form or pulling the emergency stop is not a thing any of them
 * should be one mis-tap away from.
 */
export const MASTER_COOKIE = "yatra_master";

/** 12 hours — long enough for a working session, short enough to matter. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** The unlock is deliberately short-lived; it re-locks on its own. */
const MASTER_TTL_MS = 60 * 60 * 1000;

/* Mixed into the signed message so an admin cookie can never be presented as
   a master one. The admin scope is empty, which keeps its signature exactly
   what it was before master existed — nobody is logged out by this. */
const MASTER_SCOPE = "master.";

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

async function issue(scope, ttlMs, now) {
  const expiresAt = String(now + ttlMs);
  const key = await importKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(scope + expiresAt)
  );
  return `${expiresAt}.${toBase64Url(signature)}`;
}

async function verify(scope, token) {
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
      new TextEncoder().encode(scope + expiresAt)
    );
  } catch {
    return false;
  }
}

export async function createSessionToken(now = Date.now()) {
  return issue("", SESSION_TTL_MS, now);
}

export async function verifySessionToken(token) {
  return verify("", token);
}

export async function createMasterToken(now = Date.now()) {
  return issue(MASTER_SCOPE, MASTER_TTL_MS, now);
}

export async function verifyMasterToken(token) {
  return verify(MASTER_SCOPE, token);
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

export const masterCookieOptions = {
  ...sessionCookieOptions,
  maxAge: MASTER_TTL_MS / 1000,
};
