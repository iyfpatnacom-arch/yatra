import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PolicyPage } from "@/components/site/policy-page";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { HELPLINES, ORG, TRIP } from "@/lib/config";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = getDictionary(lang);
  return {
    title: `${dict.legal.contact.title} — ${ORG.legalName}`,
    description: dict.legal.contact.summary,
    alternates: {
      canonical: `${ORG.siteUrl}/${normalizeLocale(lang)}/contact`,
    },
  };
}

function Card({ icon: Icon, heading, children }) {
  return (
    <section className="rounded-2xl border border-saffron/20 bg-card/60 p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-indigo-deep dark:text-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-saffron/15 text-saffron-deep dark:text-saffron">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {heading}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

/**
 * Contact page.
 *
 * Uses PolicyPage for the frame — same header, footer and policy strip as the
 * legal documents — but replaces the prose body, because a page whose whole
 * job is "here is how to reach a person" reads better as cards than as
 * numbered clauses.
 */
export default async function ContactPage({ params }) {
  const { lang: rawLang } = await params;
  const lang = normalizeLocale(rawLang);
  const dict = getDictionary(lang);
  const copy = dict.legal.contact;

  const helplines = [
    { label: copy.youthLabel, numbers: HELPLINES.youth },
    { label: copy.familyLabel, numbers: HELPLINES.family },
  ];

  return (
    <PolicyPage lang={lang} dict={dict} docKey="contact">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card icon={Phone} heading={copy.helplineHeading}>
          <p>{copy.helplineNote}</p>
          <ul className="mt-3 space-y-3">
            {helplines.map((group) => (
              <li key={group.label}>
                <span className="block text-xs font-semibold tracking-wide text-saffron-deep uppercase dark:text-saffron">
                  {group.label}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {group.numbers.map((number) => (
                    <a
                      key={number}
                      href={`tel:+91${number}`}
                      className="font-medium text-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
                    >
                      +91 {number}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={Mail} heading={copy.emailHeading}>
          <a
            href={`mailto:${TRIP.contactEmail}`}
            className="font-medium text-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
          >
            {TRIP.contactEmail}
          </a>
          <p className="mt-3">{copy.responseNote}</p>
        </Card>

        <Card icon={MapPin} heading={copy.addressHeading}>
          <address className="not-italic">
            <span className="block font-medium text-foreground">
              {ORG.legalName}
            </span>
            {ORG.address}
          </address>
        </Card>

        <Card icon={Clock} heading={copy.hoursHeading}>
          <p>{copy.hours}</p>
          <p className="mt-3">
            <a
              href={`tel:${TRIP.contactPhone.replace(/\s/g, "")}`}
              className="font-medium text-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
            >
              {TRIP.contactPhone}
            </a>
            <span className="ms-2 text-xs">({copy.phoneHeading})</span>
          </p>
        </Card>
      </div>
    </PolicyPage>
  );
}
