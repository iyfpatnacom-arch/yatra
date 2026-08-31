import { Mail, Phone } from "lucide-react";
import { HELPLINES, TRIP } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * The coordinator numbers and the yatra mailbox, shown directly under the
 * departure countdown.
 *
 * Youth and family bookings are run by different coordinators, so the numbers
 * are labelled rather than listed as one row — a family calling the youth
 * coordinator gets bounced, which is exactly the friction this is here to
 * remove.
 *
 * This is also the only place a visitor is offered a way to reach a human on
 * the booking pages, the footer having been reduced to links and the
 * registered address, so the email belongs here beside the numbers.
 *
 * `tel:` links carry the +91 prefix even though the label does not: a phone
 * dialling a bare 10-digit number from a browser can fail on a SIM roaming
 * outside India.
 */
export function HelplineNote({ dict, className = "" }) {
  const groups = [
    { label: dict.countdown.helpYouth, numbers: HELPLINES.youth },
    { label: dict.countdown.helpFamily, numbers: HELPLINES.family },
  ].filter((group) => group.numbers.length > 0);

  if (!groups.length && !TRIP.contactEmail) return null;

  return (
    <div className={cn("text-center", className)}>
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <Phone className="size-3" aria-hidden="true" />
        {dict.countdown.helpHeading}
      </p>

      <dl className="mt-2 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1.5 text-sm">
        {groups.map((group) => (
          <div key={group.label} className="flex items-baseline gap-1.5">
            <dt className="text-xs text-muted-foreground">{group.label}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2">
              {group.numbers.map((number) => (
                <a
                  key={number}
                  href={`tel:+91${number}`}
                  className="font-medium text-saffron-deep tabular-nums transition-colors hover:underline dark:text-gold"
                >
                  {number}
                </a>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      {TRIP.contactEmail ? (
        <a
          href={`mailto:${TRIP.contactEmail}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm break-all text-saffron-deep transition-colors hover:underline dark:text-gold"
        >
          <Mail className="size-3 shrink-0" aria-hidden="true" />
          {TRIP.contactEmail}
        </a>
      ) : null}
    </div>
  );
}
