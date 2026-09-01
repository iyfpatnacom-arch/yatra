"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { DonateButton } from "@/components/site/donate-button";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { TripCountdown } from "@/components/site/trip-countdown";
import { HelplineNote } from "@/components/site/helpline-note";
import { LegalStrip } from "@/components/site/legal-strip";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { cn } from "@/lib/utils";

/**
 * The right-hand column: a single fixed-width container that holds the whole
 * registration flow, scrolling inside itself so the photographs beside it
 * never move.
 *
 * On a phone it is the second of two views — the back button here is what
 * swaps it for the carousel again.
 */
export function RegistrationPanel({
  lang,
  dict,
  trip,
  className = "",
  onBack,
}) {
  return (
    <section
      className={cn(
        "flex-col border-saffron/15 bg-background/60 lg:h-full lg:w-[27rem] lg:shrink-0 lg:overflow-y-auto lg:border-l xl:w-[31rem]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-7 sm:py-8">
        <div className="mb-5 flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-saffron/25 px-3 py-1.5 text-xs font-medium text-saffron-deep transition-colors hover:bg-saffron/8 dark:text-saffron"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {dict.home.backToGallery}
          </button>
          <LanguageSwitcher
            lang={lang}
            label={dict.nav.switchTo}
            className="ml-auto"
          />
          <DonateButton label={dict.nav.donate} />
        </div>

        <div className="mb-6 rounded-md border border-gold/25 bg-card/60 px-4 py-4 backdrop-blur-sm">
          <TripCountdown
            targetISO={trip.departureISO}
            departureLabel={trip.departureDay}
            labels={dict.countdown}
          />
          <HelplineNote
            dict={dict}
            className="mt-4 border-t border-gold/20 pt-4"
          />
        </div>

        <RegistrationWizard lang={lang} dict={dict} />

        <footer className="mt-8 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/${lang}/admin`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-saffron-deep dark:hover:text-saffron"
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {dict.nav.admin}
            </Link>
          </div>
          <LegalStrip
            lang={lang}
            dict={dict}
            className="mt-4 border-t border-border/60 pt-4"
          />

          <p className="mt-3 leading-relaxed">
            © {trip.year} {dict.footer.org} · {dict.footer.line}
          </p>
          <p className="mt-1.5 leading-relaxed">{dict.footer.securePayments}</p>
        </footer>
      </div>
    </section>
  );
}
