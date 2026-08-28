import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  safeEqual,
  sessionCookieOptions,
} from "@/lib/admin-session";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  // Five attempts per fifteen minutes makes brute-forcing the shared password
  // impractical without locking out a coordinator who fat-fingers it twice.
  const limit = check(clientKey(request, "admin-login"), {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin-login] ADMIN_PASSWORD is not configured");
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

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(), sessionCookieOptions);
  return response;
}
