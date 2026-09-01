"use client";

import Image from "next/image";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useMediaQuery } from "@/lib/use-media-query";
import { DonateButton } from "@/components/site/donate-button";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { LegalStrip } from "@/components/site/legal-strip";
import { LotusMark } from "@/components/site/ornaments";
import { cn } from "@/lib/utils";

function MetaPill({ icon: Icon, label, value }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
      <Icon className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="truncate font-medium text-white">{value}</span>
    </span>
  );
}

/**
 * The left half of the landing page: one large image panel that carries the
 * brand, the headline and the trip's three facts.
 *
 * On a phone it is the first thing on the page and ends in the button that
 * swaps it for the form; on a desktop it is a fixed full-height column beside
 * the form, and that button is not rendered at all.
 */
export function ShowcasePanel({
  lang,
  dict,
  slides,
  posters = [],
  trip,
  className = "",
  onRegister,
}) {
  /* The posters and the photographs are two different heroes rather than one
     list styled two ways, so this is one of the few things a Tailwind
     breakpoint genuinely cannot express. A phone opens on the posters alone —
     they already carry the dates, the route and the fee, and the scenery was
     saying it a second time in a place with no room for it. A desktop keeps
     the photographs here and floats one poster over them instead, at the
     edge of this column where the form begins.

     The query asks for the desktop rather than the phone on purpose: the
     server has no viewport and answers `false`, so a phone paints the list it
     keeps and never fetches a photograph it will not show. */
  const onDesktop = useMediaQuery("(min-width: 1024px)");
  const carouselSlides = onDesktop || !posters.length ? slides : posters;
  const featured = posters[0];

  return (
    <section className={cn("relative min-w-0 lg:h-full lg:flex-1", className)}>
      {/* Desktop only: the poster rides on top of the photographs, pinned to
          the right edge of this column so it lands directly beside the form
          without scrolling away inside it. It is inset far enough to leave the
          carousel's own next-arrow reachable, and passes every event through
          to the carousel underneath it. */}
      {featured ? (
        <div className="pointer-events-none absolute top-1/2 right-16 z-10 hidden -translate-y-1/2 lg:block">
          <Image
            src={featured.src}
            alt={featured.caption}
            width={1080}
            height={1350}
            sizes="22rem"
            loading="eager"
            className="h-[60vh] max-h-[32rem] w-auto rounded-md object-contain shadow-2xl shadow-black/50 ring-1 ring-gold/40"
          />
        </div>
      ) : null}

      <HeroCarousel
        slides={carouselSlides}
        labels={dict.hero.carousel}
        className="h-[78svh] max-h-[46rem] min-h-[32rem] w-full lg:h-full lg:max-h-none"
        top={
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-white ring-1 ring-gold/50">
              <LotusMark className="w-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-heading text-sm font-semibold text-white">
                {dict.nav.brand}
              </span>
              <span className="truncate text-[11px] text-gold">
                {dict.nav.brandSub}
              </span>
            </span>

            <LanguageSwitcher
              lang={lang}
              label={dict.nav.switchTo}
              className="ml-auto border-white/25 bg-white/10 text-white hover:border-gold/60 hover:bg-white/20"
            />
            <DonateButton
              label={dict.nav.donate}
              className="border-gold/45 bg-white/10 text-gold hover:border-gold hover:bg-white/20 dark:text-gold"
            />
          </div>
        }
        bottom={
          <div className="lg:max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-xs font-medium text-gold backdrop-blur-sm">
              <LotusMark className="w-4" />
              {dict.hero.badge}
            </span>

            <h1 className="mt-4 font-heading text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
              <span className="block text-base font-normal text-white/75 sm:text-lg">
                {dict.hero.titleTop}
              </span>
              <span className="mt-1 block font-display text-gold">
                {dict.hero.titleMain}
              </span>
            </h1>

            <p className="mt-3 max-w-md text-sm text-white/75 sm:text-base">
              {dict.hero.tagline}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <MetaPill
                icon={MapPin}
                label={dict.hero.from}
                value={trip.departureCity}
              />
              <MetaPill
                icon={MapPin}
                label={dict.hero.to}
                value={trip.destination}
              />
              {trip.dates ? (
                <MetaPill
                  icon={CalendarDays}
                  label={dict.countdown.heading}
                  value={trip.dates}
                />
              ) : null}
            </div>
          </div>
        }
      />

      {/* Phone only: the handoff to the form. On desktop the form is already
          on screen, so this button would be pointing at itself. */}
      <div className="px-4 pt-5 pb-8 lg:hidden">
        <button
          type="button"
          onClick={onRegister}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-saffron to-saffron-deep text-base font-medium text-white shadow-lg shadow-saffron/25 transition-colors hover:from-saffron-deep hover:to-saffron focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          {dict.home.registerCta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
        <p className="mt-3 text-center font-heading text-xs leading-relaxed text-saffron-deep/85 dark:text-gold/80">
          {dict.hero.mantra}
        </p>
        {/* A phone shows this panel first and the form second, so the policy
            links have to be reachable from here too — not only from the
            footer of the column behind it. */}
        <LegalStrip
          lang={lang}
          dict={dict}
          className="mt-5 justify-center border-t border-border/60 pt-4"
        />
      </div>
    </section>
  );
}
