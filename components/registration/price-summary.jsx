"use client";

import { Users, Ticket, Wallet, Train } from "lucide-react";
import { calculateFee, formatINR, needsCoach } from "@/lib/config";

/**
 * Mirrors, to the rupee, what the server will charge.
 *
 * The numbers come from the same `calculateFee` the API re-runs on submit, so
 * a visitor can never be shown one total and billed another.
 */
export function PriceSummary({ dict, type, coach, travellerCount }) {
  const count = Math.max(1, travellerCount);
  const fee = calculateFee({ type, coach, travellerCount: count });
  const summary = dict.form.summary;

  /* A family that has not picked a coach yet has no fee to show. The advance
     is the same either way, so that row stays real while the rest waits. */
  const awaitingCoach = needsCoach(type) && !coach;
  const show = (amount) => (awaitingCoach ? "—" : formatINR(amount));

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/12 via-saffron/8 to-transparent">
      <div className="flex items-center gap-2 border-b border-gold/25 px-4 py-3">
        <Ticket className="size-4 text-saffron-deep dark:text-gold" aria-hidden="true" />
        <h3 className="font-heading text-sm font-semibold text-indigo-deep dark:text-foreground">
          {summary.heading}
        </h3>
      </div>

      <dl className="space-y-2.5 px-4 py-4 text-sm">
        {needsCoach(type) && coach ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Train className="size-3.5" aria-hidden="true" />
              {summary.coach}
            </dt>
            <dd className="font-medium">{dict.form.coach[coach]}</dd>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{summary.perPerson}</dt>
          <dd className="font-medium tabular-nums">
            {show(fee.perPerson)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {summary.travellers}
          </dt>
          <dd className="font-medium tabular-nums">&times; {count}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-gold/30 pt-3">
          <dt className="font-medium text-foreground">{summary.total}</dt>
          <dd className="font-heading text-xl font-bold text-indigo-deep tabular-nums dark:text-foreground">
            {show(fee.total)}
          </dd>
        </div>
      </dl>

      {/* The advance is the only figure the gateway will see today, so it gets
          the loudest treatment in the panel. */}
      <div className="border-t border-gold/30 bg-saffron/10 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Wallet className="size-3.5 text-saffron-deep dark:text-gold" aria-hidden="true" />
            {summary.advance}
          </span>
          <span
            className="font-heading text-2xl font-bold text-saffron-deep tabular-nums dark:text-gold"
            aria-live="polite"
          >
            {formatINR(fee.advanceDue)}
          </span>
        </div>

        {fee.balanceDue > 0 || awaitingCoach ? (
          <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{summary.balance}</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {show(fee.balanceDue)}
            </span>
          </div>
        ) : null}
      </div>

      <p className="border-t border-gold/25 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {fee.balanceDue > 0 || awaitingCoach
          ? summary.balanceNote
          : summary.note}
      </p>
    </div>
  );
}
