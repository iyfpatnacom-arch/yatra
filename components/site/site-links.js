/**
 * The site's link map, in one place.
 *
 * The header, the footer and the compact strip on the landing page all have to
 * agree on which policy pages exist — a payment gateway review fails on a
 * footer link that 404s — so the routes are declared once here and every
 * navigation surface builds itself from this list.
 *
 * `key` indexes into `dict.nav`; nothing here carries copy of its own.
 */

/** Pages a visitor uses to get around the site. */
export const MAIN_LINKS = [
  { key: "home", href: "" },
  { key: "bookNow", href: "" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

/**
 * The four documents the payment gateway requires to be published and
 * reachable from every page.
 */
export const POLICY_LINKS = [
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "refund", href: "/refund" },
  { key: "shipping", href: "/shipping" },
];

/** Prefixes a link's href with the active locale: "/privacy" -> "/hi/privacy". */
export function localised(lang, href) {
  return `/${lang}${href}`;
}
