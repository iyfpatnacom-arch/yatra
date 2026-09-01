import { Landmark, Music4, UtensilsCrossed, BedDouble } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MandalaMark } from "@/components/site/ornaments";

const ICONS = [Landmark, Music4, UtensilsCrossed, BedDouble];

const ACCENTS = [
  "from-saffron/18 to-gold/10 text-saffron-deep dark:text-saffron",
  "from-indigo-krishna/18 to-lotus/10 text-indigo-krishna",
  "from-tulsi/18 to-gold/10 text-tulsi",
  "from-lotus/18 to-saffron/10 text-lotus",
];

export function TripHighlights({ dict }) {
  return (
    <section id="details" className="relative scroll-mt-20 py-16 sm:py-20">
      <MandalaMark className="pointer-events-none absolute top-1/2 left-1/2 hidden w-[40rem] -translate-x-1/2 -translate-y-1/2 text-saffron/6 md:block" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-indigo-deep sm:text-4xl dark:text-foreground">
            {dict.highlights.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {dict.highlights.subheading}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dict.highlights.items.map((item, index) => {
            const Icon = ICONS[index] || Landmark;
            return (
              <Card
                key={item.title}
                className="group h-full gap-3 border-0 bg-card/80 p-5 ring-1 ring-saffron/12 backdrop-blur-sm transition-all hover:-translate-y-1 hover:ring-saffron/35 hover:shadow-lg hover:shadow-saffron/10"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-md bg-gradient-to-br ${ACCENTS[index % ACCENTS.length]}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
