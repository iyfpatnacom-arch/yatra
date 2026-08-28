import Link from "next/link";
import { ArrowRight, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlutePeacockMark } from "@/components/site/ornaments";
import { ADVANCE_PER_PERSON, FEES, formatINR } from "@/lib/config";
import { format } from "@/lib/i18n";

/**
 * The fork between the two registration pages.
 *
 * Youth and families pay different fees, so they get different pages rather
 * than tabs — the price a visitor sees is then the only price on screen, and
 * the URL they share sends the next person to the right form.
 */
export function CategoryChoice({ lang, dict }) {
  const options = [
    {
      href: `/${lang}/youth`,
      icon: UserRound,
      copy: dict.choose.youth,
      price: format(dict.choose.youth.price, {
        amount: formatINR(FEES.youth),
      }),
      accent: "from-saffron/16 to-gold/8 text-saffron-deep dark:text-saffron",
      ring: "hover:ring-saffron/40",
    },
    {
      href: `/${lang}/family`,
      icon: Users,
      copy: dict.choose.family,
      price: format(dict.choose.family.price, {
        from: formatINR(FEES.family.sleeper),
        to: formatINR(FEES.family.ac),
      }),
      accent: "from-indigo-krishna/16 to-lotus/8 text-indigo-krishna",
      ring: "hover:ring-indigo-krishna/40",
    },
  ];

  return (
    <section
      id="register"
      className="relative scroll-mt-20 border-t border-saffron/12 bg-gradient-to-b from-cream/60 to-transparent py-16 sm:py-20 dark:from-card/40"
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <FlutePeacockMark className="mx-auto mb-4 w-10 text-saffron" />
          <h2 className="font-heading text-3xl font-bold text-indigo-deep sm:text-4xl dark:text-foreground">
            {dict.choose.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {dict.choose.subheading}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {options.map(({ href, icon: Icon, copy, price, accent, ring }) => (
            <Card
              key={href}
              className={`h-full gap-4 border-0 bg-card/85 p-6 ring-1 ring-saffron/12 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-saffron/10 ${ring}`}
            >
              <span
                className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>

              <h3 className="font-heading text-xl font-semibold text-indigo-deep dark:text-foreground">
                {copy.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy.blurb}
              </p>

              <p className="font-heading text-lg font-bold text-saffron-deep tabular-nums dark:text-gold">
                {price}
              </p>
              {copy.note ? (
                <p className="text-xs text-muted-foreground">{copy.note}</p>
              ) : null}

              <Button
                render={<Link href={href} />}
                className="mt-auto h-11 w-full rounded-xl bg-gradient-to-r from-saffron to-saffron-deep text-base shadow-sm hover:from-saffron-deep hover:to-saffron"
              >
                {copy.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-gold/25 bg-gold/8 px-4 py-3 text-center text-sm text-saffron-deep dark:text-gold">
          {format(dict.choose.advanceNote, {
            amount: formatINR(ADVANCE_PER_PERSON),
          })}
        </p>
      </div>
    </section>
  );
}
