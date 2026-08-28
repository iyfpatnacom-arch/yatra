import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";

/**
 * Two jobs:
 *  1. Keep every page under a /hi or /en prefix. Hindi is THE default — the
 *     only thing that sends a visitor to /en is having picked English before,
 *     which the language switcher records in a cookie.
 *  2. Gate /:lang/admin behind a valid signed session cookie.
 *
 * The admin check here is a fast redirect for humans; every /api/admin route
 * re-verifies the cookie itself, so this is convenience, not the security
 * boundary.
 */

const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$/i;

function localeFromPath(pathname) {
  const [, first] = pathname.split("/");
  return locales.includes(first) ? first : null;
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const lang = localeFromPath(pathname);

  if (!lang) {
    const target = request.nextUrl.clone();
    /* Accept-Language is deliberately ignored: nearly every phone sold here
       reports en-US regardless of what its owner reads, so sniffing it sent
       most visitors to the English site. Only an explicit choice counts. */
    const cookieLocale = request.cookies.get("yatra_lang")?.value;
    const chosen = locales.includes(cookieLocale) ? cookieLocale : defaultLocale;
    target.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`;
    target.search = search;
    return NextResponse.redirect(target);
  }

  if (pathname.startsWith(`/${lang}/admin`) && pathname !== `/${lang}/admin/login`) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await verifySessionToken(token);
    if (!valid) {
      const login = request.nextUrl.clone();
      login.pathname = `/${lang}/admin/login`;
      login.search = "";
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
