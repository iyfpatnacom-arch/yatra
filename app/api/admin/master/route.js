import { NextResponse } from "next/server";
import {
  createMasterToken,
  masterCookieOptions,
  MASTER_COOKIE,
  safeEqual,
} from "@/lib/admin-session";
import { isAdmin, isMasterAdmin, unauthorized } from "@/lib/require-admin";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the registration controls should be shown at all. */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return NextResponse.json({ ok: true, unlocked: await isMasterAdmin() });
}

/** Trades MASTER_ADMIN_PASSWORD for the short-lived unlock cookie. */
export async function POST(request) {
  if (!(await isAdmin())) return unauthorized();

  const limit = check(clientKey(request, "admin-master"), {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const expected = process.env.MASTER_ADMIN_PASSWORD;
  /* Unset means nobody can unlock — the controls stay hidden rather than
     falling back to the shared admin password, which would defeat the point. */
  if (!expected) {
    console.error("[admin-master] MASTER_ADMIN_PASSWORD is not configured");
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  let password;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 400 });
  }

  if (typeof password !== "string" || !password) {
    return NextResponse.json(
      { ok: false, error: "password_required" },
      { status: 400 }
    );
  }

  if (!safeEqual(password, expected)) {
    return NextResponse.json(
      { ok: false, error: "invalid_password" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, unlocked: true });
  response.cookies.set(MASTER_COOKIE, await createMasterToken(), masterCookieOptions);
  return response;
}

/** Locks again without ending the admin session. */
export async function DELETE() {
  if (!(await isAdmin())) return unauthorized();
  const response = NextResponse.json({ ok: true, unlocked: false });
  response.cookies.set(MASTER_COOKIE, "", { ...masterCookieOptions, maxAge: 0 });
  return response;
}
