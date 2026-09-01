"use client";

import { Train, Users, Wallet } from "lucide-react";
import { calculateFee, formatINR } from "@/lib/config";

/**
 * What the gateway is about to be asked for, and nothing else.
 *
 * The full yatra fee is settled with the coordinator offline, so this panel
 * deliberately shows only the booking amount — the same figure the server
 * re-derives from `calculateFee` when the payment request is signed, so a
 * visitor can never be shown one number and charged another.
 */
export function AdvanceSummary({ dict, type, coach, travellerCount }) {
  const count = Math.max(1, travellerCount);
  const fee = calculateFee({ type, coach, travellerCount: count });
  const summary = dict.form.summary;

  return (
    <div className="overflow-hidden rounded-md border border-gold/35 bg-gradient-to-br from-gold/12 via-saffron/8 to-transparent">
      <dl className="space-y-2.5 px-4 py-4 text-sm">
        {coach ? (
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
            {formatINR(fee.advancePerPerson)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {summary.travellers}
          </dt>
          <dd className="font-medium tabular-nums">&times; {count}</dd>
        </div>
      </dl>

      <div className="border-t border-gold/30 bg-saffron/10 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Wallet
              className="size-3.5 text-saffron-deep dark:text-gold"
              aria-hidden="true"
            />
            {summary.payable}
          </span>
          <span
            className="font-heading text-2xl font-bold text-saffron-deep tabular-nums dark:text-gold"
            aria-live="polite"
          >
            {formatINR(fee.advanceDue)}
          </span>
        </div>
      </div>

      <p className="border-t border-gold/25 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {summary.note}
      </p>
    </div>
  );
}
