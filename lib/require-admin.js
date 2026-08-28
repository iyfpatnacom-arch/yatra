import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "./admin-session";

/**
 * The real authorization boundary. proxy.js redirects unauthenticated humans
 * for a nicer experience, but every admin route handler calls this — a route
 * handler is reachable directly, so it must never trust the proxy.
 */
export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function unauthorized() {
  return Response.json(
    { ok: false, error: "unauthorized" },
    { status: 401 }
  );
}
