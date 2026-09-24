import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  MASTER_COOKIE,
  sessionCookieOptions,
} from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const expired = { ...sessionCookieOptions, maxAge: 0 };
  response.cookies.set(ADMIN_COOKIE, "", expired);
  response.cookies.set(MASTER_COOKIE, "", expired);
  return response;
}
