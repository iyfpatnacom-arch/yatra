import Link from "next/link";
import { CalendarDays, MapPin, IndianRupee, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaMark, LotusMark, ArchBand } from "@/components/site/ornaments";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { TripCountdown } from "@/components/site/trip-countdown";
import { ADVANCE_PER_PERSON, HERO_SLIDES, TRIP, formatINR } from "@/lib/config";

function localeOf(lang) {
  return lang === "hi" ? "hi-IN" : "en-IN";
}

function formatDateRange(lang, startISO, endISO) {
  const locale = localeOf(lang);
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });
  const full = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  return sameMonth
    ? `${day.format(start)}–${full.format(end)}`
    : `${full.format(start)} – ${full.format(end)}`;
}

function formatDay(lang, iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-saffron/20 bg-card/70 px-4 py-3 backdrop-blur-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-saffron/12 text-saffron-deep dark:text-saffron">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="truncate font-semibold text-foreground">{value}</span>
      </span>
    </div>
  );
}

export function Hero({ lang, dict }) {
  const dates = formatDateRange(lang, TRIP.startDate, TRIP.endDate);
  const departureDay = formatDay(lang, TRIP.startDate);

  // The trip dates are Indian local time; pinning the offset keeps the
  // countdown honest for a visitor whose device clock is set elsewhere.
  const departureISO = `${TRIP.startDate}T${TRIP.departureTime}:00+05:30`;

  const slides = HERO_SLIDES.map((slide) => ({
    src: slide.src,
    caption: dict.hero.slides[slide.captionKey] || "",
  }));

  return (
    <section className="relative overflow-hidden">
      {/* Ambient ornamentation — purely decorative. */}
      <MandalaMark className="animate-yatra-spin-slow pointer-events-none absolute -top-28 -right-28 w-[26rem] text-saffron/20 sm:-right-20 sm:w-[34rem]" />
      <MandalaMark className="pointer-events-none absolute -bottom-40 -left-32 hidden w-[28rem] text-indigo-krishna/12 lg:block" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/12 px-4 py-1.5 text-xs font-medium text-saffron-deep sm:text-sm dark:text-gold">
              <LotusMark className="w-4" />
              {dict.hero.badge}
            </span>

            <h1 className="mt-5 font-heading text-4xl leading-tight font-bold tracking-tight text-indigo-deep sm:text-5xl lg:text-6xl dark:text-foreground">
              <span className="block text-lg font-normal text-saffron-deep sm:text-xl lg:text-2xl dark:text-saffron">
                {dict.hero.titleTop}
              </span>
              <span className="yatra-gradient-text mt-1 block font-display">
                {dict.hero.titleMain}
              </span>
            </h1>

            <p className="mt-4 max-w-md text-base text-muted-foreground">
              {dict.hero.tagline}
            </p>

            <div className="mt-7 w-full max-w-md rounded-md border border-gold/25 bg-card/60 px-4 py-4 backdrop-blur-sm">
              <TripCountdown
                targetISO={departureISO}
                departureLabel={departureDay}
                labels={dict.countdown}
              />
            </div>

            <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Button
                render={<Link href={`/${lang}/youth`} />}
                size="lg"
                className="h-12 flex-1 rounded-md bg-gradient-to-r from-saffron to-saffron-deep px-6 text-base shadow-lg shadow-saffron/25 hover:from-saffron-deep hover:to-saffron"
              >
                {dict.hero.ctaYouth}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                render={<Link href={`/${lang}/family`} />}
                variant="outline"
                size="lg"
                className="h-12 flex-1 rounded-md border-indigo-krishna/30 px-6 text-base text-indigo-deep hover:bg-indigo-krishna/8 dark:text-foreground"
              >
                <Users className="size-4" aria-hidden="true" />
                {dict.hero.ctaFamily}
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <HeroCarousel slides={slides} labels={dict.hero.carousel} />
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <InfoPill
            icon={MapPin}
            label={dict.hero.from}
            value={TRIP.departureCity[lang] || TRIP.departureCity.en}
          />
          <InfoPill
            icon={CalendarDays}
            label={dict.hero.to}
            value={
              dates
                ? `${TRIP.destination[lang] || TRIP.destination.en} · ${dates}`
                : TRIP.destination[lang] || TRIP.destination.en
            }
          />
          <InfoPill
            icon={IndianRupee}
            label={dict.hero.advance}
            value={`${formatINR(ADVANCE_PER_PERSON)} ${dict.hero.perPerson}`}
          />
        </div>

        <p className="mt-8 text-center font-heading text-xs leading-relaxed text-saffron-deep/80 sm:text-sm dark:text-gold/80">
          {dict.hero.mantra}
        </p>
      </div>

      <ArchBand />
    </section>
  );
}
