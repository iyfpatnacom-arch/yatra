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

/**
 * Donations are collected on the IYF Patna site, not here, so this is the one
 * link in the map that leaves the yatra site. It is kept out of MAIN_LINKS
 * because the surfaces that want it place it deliberately — the header and the
 * landing page carry it as a button beside the language switcher, and only the
 * link lists that have no button of their own append it.
 */
export const DONATE_LINK = {
  key: "donate",
  href: "https://iyfpatna.in/en/donate",
  external: true,
};

/**
 * Prefixes a link's href with the active locale: "/privacy" -> "/hi/privacy".
 * An absolute URL is somebody else's route and is passed through untouched.
 */
export function localised(lang, href) {
  if (/^https?:\/\//.test(href)) return href;
  return `/${lang}${href}`;
}

/**
 * Anchor props for a link that leaves the site, so every surface opens the
 * donation page the same way. Returns null for our own routes, which spreads
 * to nothing.
 */
export function linkTargetProps(link) {
  return link.external ? { target: "_blank", rel: "noopener noreferrer" } : null;
}
