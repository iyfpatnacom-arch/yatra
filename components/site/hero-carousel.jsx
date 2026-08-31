"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LotusMark, MandalaMark } from "@/components/site/ornaments";
import { cn } from "@/lib/utils";
import { format } from "@/lib/i18n";

/** Long enough to read a caption before the photograph under it changes. */
const AUTOPLAY_MS = 5000;

/** Ornamental stand-in so a slide without a photo still looks deliberate. */
function PlaceholderSlide({ index }) {
  const tints = [
    "from-saffron/40 via-gold/25 to-indigo-deep/50",
    "from-indigo-krishna/45 via-lotus/20 to-indigo-deep/60",
    "from-tulsi/35 via-gold/22 to-indigo-deep/55",
    "from-lotus/35 via-saffron/22 to-indigo-deep/55",
  ];

  return (
    <div
      className={`flex size-full items-center justify-center bg-gradient-to-br ${tints[index % tints.length]}`}
    >
      <MandalaMark className="animate-yatra-spin-slow w-2/3 max-w-96 text-white/30" />
      <LotusMark className="absolute w-20 text-white/55" />
    </div>
  );
}

/**
 * The image panel the whole landing page is built around.
 *
 * It fills whatever box the parent gives it — a tall viewport column on
 * desktop, a shorter banner on a phone — and layers the page's own copy on top
 * through the `top` and `bottom` slots, so the caption, the dots and the
 * headline read as one block rather than three stacked widgets.
 *
 * Auto-advances until the visitor touches a control or hovers it, and never
 * auto-advances at all when the OS asks for reduced motion — the slides are
 * decorative, but they sit directly behind text someone may be reading.
 */
export function HeroCarousel({
  slides,
  labels,
  className = "",
  top = null,
  bottom = null,
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userTook, setUserTook] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);

  const count = slides.length;
  const showingPoster = Boolean(slides[active]?.poster);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const go = useCallback(
    (next) => setActive((current) => (next + count) % count),
    [count]
  );

  const take = useCallback(
    (next) => {
      setUserTook(true);
      go(next);
    },
    [go]
  );

  useEffect(() => {
    if (count < 2 || paused || userTook || reduceMotion) return;
    const timer = setInterval(() => go(active + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [active, count, go, paused, userTook, reduceMotion]);

  function onKeyDown(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      take(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      take(active - 1);
    }
  }

  function onTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 40) return;
    take(delta < 0 ? active + 1 : active - 1);
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={cn(
        "group relative isolate overflow-hidden bg-indigo-deep focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold",
        className
      )}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.caption + index}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {slide.src ? (
            <Image
              src={slide.src}
              alt={slide.caption}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              /* A poster carries its own headline and artwork, so it is fitted
                 whole rather than cropped to fill the frame. */
              className={slide.poster ? "object-contain" : "object-cover"}
              {...(index === 0 ? { preload: true } : { loading: "lazy" })}
            />
          ) : (
            <PlaceholderSlide index={index} />
          )}
        </div>
      ))}

      {/* Two scrims, not one: the top keeps the brand legible, the bottom
          carries the headline and caption over any photograph. Over a poster
          the bottom one would be dimming artwork nobody asked us to dim. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-deep/70 to-transparent" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-deep/92 via-indigo-deep/45 to-transparent transition-opacity duration-500",
          showingPoster && "opacity-0"
        )}
      />

      <div className="relative flex size-full flex-col p-5 sm:p-7 lg:p-9">
        {top}

        <div className="mt-auto">
          {/* Kept mounted so the page keeps its heading whichever slide is
              showing, and made inert so nothing reads or reaches a headline
              that is currently faded out behind a poster. */}
          <div
            inert={showingPoster || undefined}
            className={cn(
              "transition-opacity duration-500",
              showingPoster && "pointer-events-none opacity-0"
            )}
          >
            {bottom}

            <p
              key={active}
              className="mt-5 font-heading text-sm leading-snug text-white/85 drop-shadow sm:text-base"
            >
              {slides[active].caption}
            </p>
          </div>

          {count > 1 ? (
            <div className="mt-4 flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.caption + index}
                  type="button"
                  onClick={() => take(index)}
                  aria-label={format(labels.goTo, { n: index + 1 })}
                  aria-current={index === active || undefined}
                  className={`h-1.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    index === active
                      ? "w-8 bg-gold"
                      : "w-1.5 bg-white/45 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => take(active - 1)}
            aria-label={labels.prev}
            className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/30 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold group-hover:opacity-100"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => take(active + 1)}
            aria-label={labels.next}
            className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/30 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold group-hover:opacity-100"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
