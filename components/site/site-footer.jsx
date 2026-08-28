import Link from "next/link";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { ArchBand, LotusMark } from "@/components/site/ornaments";
import { TRIP } from "@/lib/config";

export function SiteFooter({ lang, dict }) {
  return (
    <footer className="mt-auto">
      <ArchBand className="rotate-180" />
      <div className="bg-indigo-deep text-background/90 dark:bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
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
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-gold uppercase">
                {dict.footer.contact}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href={`tel:${TRIP.contactPhone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 text-background/80 transition-colors hover:text-gold dark:text-muted-foreground"
                  >
                    <Phone className="size-3.5" aria-hidden="true" />
                    {TRIP.contactPhone}
                  </a>
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
            </div>

            <div className="lg:justify-self-end">
              <Link
                href={`/${lang}/admin`}
                className="inline-flex items-center gap-2 rounded-full border border-background/20 px-4 py-2 text-sm text-background/75 transition-colors hover:border-gold/50 hover:text-gold dark:border-border dark:text-muted-foreground"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                {dict.nav.admin}
              </Link>
            </div>
          </div>

          <p className="mt-10 border-t border-background/15 pt-6 text-center text-xs text-background/55 dark:border-border dark:text-muted-foreground">
            © {new Date().getFullYear()} {dict.footer.org} · {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
