import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { ArchBand, LotusMark } from "@/components/site/ornaments";
import {
  MAIN_LINKS,
  POLICY_LINKS,
  localised,
} from "@/components/site/site-links";
import { ORG } from "@/lib/config";

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-background/75 transition-colors hover:text-gold dark:text-muted-foreground dark:hover:text-gold"
    >
      {children}
    </Link>
  );
}

/**
 * Site footer.
 *
 * Carries the four policy documents and the registered address. A payment
 * gateway review looks for exactly these on every page, so the columns are not
 * decorative — dropping a link here is what fails an application.
 *
 * The coordinator numbers and the yatra mailbox are deliberately not repeated
 * here: they sit under the departure countdown (see HelplineNote) and on the
 * contact page, which the footer links to.
 */
export function SiteFooter({ lang, dict }) {
  return (
    <footer className="mt-auto">
      <ArchBand className="rotate-180" />
      <div className="bg-indigo-deep text-background/90 dark:bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Identity */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-primary-foreground">
                  <LotusMark className="w-5" />
                </span>
                <span className="font-heading text-lg font-semibold text-gold">
                  {dict.footer.org}
                </span>
              </div>
              <p className="mt-3 text-sm text-background/70 dark:text-muted-foreground">
                {dict.footer.line}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-background/55 dark:text-muted-foreground">
                {dict.footer.founder}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-background/55 dark:text-muted-foreground">
                {dict.footer.operatedBy}
              </p>
            </div>

            {/* Yatra */}
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.quickLinks}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {MAIN_LINKS.map((link) => (
                  <li key={link.key}>
                    <FooterLink href={localised(lang, link.href)}>
                      {dict.nav[link.key]}
                    </FooterLink>
                  </li>
                ))}
                <li>
                  <Link
                    href={`/${lang}/admin`}
                    className="inline-flex items-center gap-1.5 text-background/60 transition-colors hover:text-gold dark:text-muted-foreground dark:hover:text-gold"
                  >
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    {dict.nav.admin}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.legal}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {POLICY_LINKS.map((link) => (
                  <li key={link.key}>
                    <FooterLink href={localised(lang, link.href)}>
                      {dict.nav[link.key]}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Address */}
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.address}
              </h3>
              <p className="mt-3 flex gap-2 text-background/70 dark:text-muted-foreground">
                <MapPin
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-xs leading-relaxed">{ORG.address}</span>
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-background/15 pt-6 dark:border-border">
            <p className="text-center text-xs text-background/55 dark:text-muted-foreground">
              {dict.footer.securePayments}
            </p>
            <p className="mt-2 text-center text-xs text-background/55 dark:text-muted-foreground">
              © {new Date().getFullYear()} {dict.footer.org} ·{" "}
              {dict.footer.rights}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
