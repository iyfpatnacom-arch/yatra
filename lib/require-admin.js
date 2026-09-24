import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  MASTER_COOKIE,
  verifyMasterToken,
  verifySessionToken,
} from "./admin-session";

/**
 * The real authorization boundary. proxy.js redirects unauthenticated humans
 * for a nicer experience, but every admin route handler calls this — a route
 * handler is reachable directly, so it must never trust the proxy.
 */
export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** A master unlock is worthless without a logged-in admin behind it. */
export async function isMasterAdmin() {
  const store = await cookies();
  if (!(await verifySessionToken(store.get(ADMIN_COOKIE)?.value))) return false;
  return verifyMasterToken(store.get(MASTER_COOKIE)?.value);
}

export function unauthorized() {
  return Response.json(
    { ok: false, error: "unauthorized" },
    { status: 401 }
  );
}

/** 403, not 401: the session is fine, it just is not the master admin's. */
export function masterRequired() {
  return Response.json(
    { ok: false, error: "master_required" },
    { status: 403 }
  );
}
