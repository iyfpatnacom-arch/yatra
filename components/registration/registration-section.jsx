import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RegistrationForm } from "@/components/registration/registration-form";
import { FlutePeacockMark, MandalaMark } from "@/components/site/ornaments";
import { TripCountdown } from "@/components/site/trip-countdown";
import { TRIP } from "@/lib/config";

function formatDay(lang, iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * One registration page, for one category.
 *
 * Youth and families see the same fields but never the same prices, so each
 * gets its own URL and its own heading rather than sharing a tab strip.
 */
export function RegistrationSection({ mode, lang, dict }) {
  const other = mode === "youth" ? "family" : "youth";
  const switchLabel =
    mode === "youth" ? dict.form.switchToFamily : dict.form.switchToYouth;

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      <MandalaMark className="pointer-events-none absolute -top-40 -right-32 w-[30rem] text-saffron/10" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Link
          href={`/${lang}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {dict.status.backHome}
        </Link>

        <div className="mt-6 text-center">
          <FlutePeacockMark className="mx-auto mb-4 w-10 text-saffron" />
          <h1 className="font-heading text-3xl font-bold text-indigo-deep sm:text-4xl dark:text-foreground">
            {dict.form.headings[mode]}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {dict.form.subheadings[mode]}
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-md rounded-2xl border border-gold/25 bg-card/60 px-4 py-4 backdrop-blur-sm">
          <TripCountdown
            targetISO={`${TRIP.startDate}T${TRIP.departureTime}:00+05:30`}
            departureLabel={formatDay(lang, TRIP.startDate)}
            labels={dict.countdown}
          />
        </div>

        <div className="mt-10">
          <RegistrationForm mode={mode} lang={lang} dict={dict} />
        </div>

        <p className="mt-10 text-center">
          <Link
            href={`/${lang}/${other}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-saffron/25 px-4 py-2 text-sm text-saffron-deep transition-colors hover:bg-saffron/8 dark:text-saffron"
          >
            {switchLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}
