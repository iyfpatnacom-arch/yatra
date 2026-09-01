"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { format } from "@/lib/i18n";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function split(ms) {
  return {
    days: Math.floor(ms / DAY),
    hours: Math.floor((ms % DAY) / HOUR),
    minutes: Math.floor((ms % HOUR) / MINUTE),
    seconds: Math.floor((ms % MINUTE) / SECOND),
  };
}

function Unit({ value, label }) {
  return (
    <div className="flex min-w-14 flex-col items-center rounded-md border border-gold/30 bg-card/80 px-2.5 py-2 backdrop-blur-sm sm:min-w-16 sm:px-3">
      <span className="font-display text-2xl leading-none text-saffron-deep tabular-nums sm:text-3xl dark:text-gold">
        {value === null ? "––" : String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}

/**
 * Live countdown to departure.
 *
 * The first render is deliberately blank ("––"): the server has no idea what
 * time it is in the visitor's browser, and rendering a real number here would
 * be a hydration mismatch that React throws away a second later anyway.
 */
export function TripCountdown({ targetISO, departureLabel, labels }) {
  const [left, setLeft] = useState(null);

  useEffect(() => {
    const target = new Date(targetISO).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const timer = setInterval(tick, SECOND);
    return () => clearInterval(timer);
  }, [targetISO]);

  const departed = left === 0;
  const parts = left === null ? null : split(left);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 text-xs font-medium tracking-wide text-saffron-deep uppercase dark:text-gold">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        {departed ? labels.departed : labels.heading}
      </div>

      {!departed ? (
        <div
          className="mt-3 flex items-center justify-center gap-2 sm:gap-2.5"
          role="timer"
          aria-live="off"
        >
          <Unit value={parts?.days ?? null} label={labels.days} />
          <Unit value={parts?.hours ?? null} label={labels.hours} />
          <Unit value={parts?.minutes ?? null} label={labels.minutes} />
          <Unit value={parts?.seconds ?? null} label={labels.seconds} />
        </div>
      ) : null}

      {departureLabel ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {format(labels.on, { date: departureLabel })}
        </p>
      ) : null}
    </div>
  );
}
