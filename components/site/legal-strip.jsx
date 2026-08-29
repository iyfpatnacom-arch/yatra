import Link from "next/link";
import {
  MAIN_LINKS,
  POLICY_LINKS,
  localised,
} from "@/components/site/site-links";
import { cn } from "@/lib/utils";

/**
 * Compact row of the policy documents, for the landing page.
 *
 * The landing page is a fixed full-height two-column layout and cannot carry
 * the full SiteFooter without breaking that, but the payment gateway requires
 * the policy documents to be reachable from the page money is taken on. This
 * is that link set at the smallest size it stays legible and tappable at.
 */
export function LegalStrip({ lang, dict, className = "", tone = "light" }) {
  const links = [
    ...MAIN_LINKS.filter((link) => link.href),
    ...POLICY_LINKS,
  ];

  return (
    <nav
      aria-label={dict.footer.legal}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs",
        className
      )}
    >
      {links.map((link) => (
        <Link
          key={link.key}
          href={localised(lang, link.href)}
          className={cn(
            "transition-colors",
            tone === "dark"
              ? "text-white/70 hover:text-gold"
              : "text-muted-foreground hover:text-saffron-deep dark:hover:text-saffron"
          )}
        >
          {dict.nav[link.key]}
        </Link>
      ))}
    </nav>
  );
}
