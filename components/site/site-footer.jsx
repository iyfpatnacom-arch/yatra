import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ArchBand, LotusMark } from "@/components/site/ornaments";
import {
  MAIN_LINKS,
  POLICY_LINKS,
  localised,
} from "@/components/site/site-links";
import { HELPLINES, ORG, TRIP } from "@/lib/config";

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
 * Carries the four policy documents, the registered address and the
 * coordinator helplines. A payment gateway review looks for exactly these on
 * every page, so the column is not decorative — dropping a link here is what
 * fails an application.
 */
export function SiteFooter({ lang, dict }) {
  const helplines = [
    { label: dict.countdown.helpYouth, numbers: HELPLINES.youth },
    { label: dict.countdown.helpFamily, numbers: HELPLINES.family },
  ];

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

            {/* Contact */}
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.contact}
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex gap-2 text-background/70 dark:text-muted-foreground">
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-xs leading-relaxed">{ORG.address}</span>
                </li>
                <li>
                  <a
                    href={`mailto:${TRIP.contactEmail}`}
                    className="inline-flex items-center gap-2 text-background/80 transition-colors hover:text-gold dark:text-muted-foreground"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    {TRIP.contactEmail}
                  </a>
                </li>
              </ul>

              <h3 className="mt-5 font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.helpline}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {helplines.map((group) => (
                  <li key={group.label}>
                    <span className="block text-xs text-background/55 dark:text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      {group.numbers.map((number) => (
                        <a
                          key={number}
                          href={`tel:+91${number}`}
                          className="inline-flex items-center gap-1.5 text-background/80 transition-colors hover:text-gold dark:text-muted-foreground"
                        >
                          <Phone className="size-3" aria-hidden="true" />
                          {number}
                        </a>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
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
