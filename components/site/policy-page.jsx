import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { MandalaMark } from "@/components/site/ornaments";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { POLICY_LINKS, localised } from "@/components/site/site-links";
import {
  ADVANCE_PER_PERSON,
  HELPLINES,
  MAX_MEMBERS,
  ORG,
  TRIP,
  formatINR,
} from "@/lib/config";
import { format } from "@/lib/i18n";

/**
 * The contact block that closes most policy documents.
 *
 * Every page that ends in "contact us" renders the same details from
 * lib/config rather than repeating them in each dictionary — a phone number
 * that appears in six places is a phone number that will eventually be right
 * in five of them.
 */
function ContactBlock({ dict }) {
  const helplines = [
    { label: dict.countdown.helpYouth, numbers: HELPLINES.youth },
    { label: dict.countdown.helpFamily, numbers: HELPLINES.family },
  ];

  return (
    <div className="mt-4 rounded-xl border border-saffron/20 bg-saffron/4 p-4 sm:p-5">
      <p className="font-heading text-base font-semibold text-indigo-deep dark:text-foreground">
        {ORG.legalName}
      </p>

      <ul className="mt-3 space-y-2.5 text-sm">
        <li className="flex gap-2.5 text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden="true" />
          <span className="leading-relaxed">{ORG.address}</span>
        </li>
        <li>
          <a
            href={`mailto:${TRIP.contactEmail}`}
            className="inline-flex items-center gap-2.5 text-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
          >
            <Mail className="size-4 shrink-0 text-saffron" aria-hidden="true" />
            {TRIP.contactEmail}
          </a>
        </li>
        {helplines.map((group) => (
          <li key={group.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2.5 text-muted-foreground">
              <Phone className="size-4 shrink-0 text-saffron" aria-hidden="true" />
              {group.label}
            </span>
            {group.numbers.map((number) => (
              <a
                key={number}
                href={`tel:+91${number}`}
                className="font-medium text-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
              >
                {number}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({ item, values }) {
  // A bullet is either a sentence or a { term, text } pair — the pairs are
  // what turn the cancellation slabs and the data categories into something
  // scannable rather than a wall of prose.
  if (typeof item === "string") {
    return <li className="leading-relaxed">{format(item, values)}</li>;
  }
  return (
    <li className="leading-relaxed">
      <strong className="font-semibold text-foreground">
        {format(item.term, values)}
      </strong>{" "}
      — {format(item.text, values)}
    </li>
  );
}

/** "2026-08-29" -> "29 August 2026", in the reader's locale. */
function formatUpdated(lang, iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Renders one legal document from the structured content in lib/i18n/legal-*.
 *
 * Server component: the pages are static prose, and shipping a client bundle
 * for a privacy policy would be the wrong trade.
 *
 * `docKey` names both the document in `dict.legal` and its entry in
 * POLICY_LINKS, which is what lets the "other policies" strip at the foot
 * exclude the page you are already on.
 */
export function PolicyPage({ lang, dict, docKey, children }) {
  const doc = dict.legal[docKey];

  /* Every {placeholder} the legal copy can use. Money and limits come from
     the same constants the registration form charges by, so a fee change
     never leaves the Terms quoting last season's amount. */
  const values = {
    org: ORG.legalName,
    domain: ORG.domain,
    address: ORG.address,
    email: TRIP.contactEmail,
    phone: TRIP.contactPhone,
    city: TRIP.departureCity[lang] || TRIP.departureCity.en,
    advance: formatINR(ADVANCE_PER_PERSON),
    maxMembers: MAX_MEMBERS,
  };

  const updatedLabel = formatUpdated(lang, ORG.policyUpdated);
  const others = POLICY_LINKS.filter((link) => link.key !== docKey);

  return (
    <>
      <SiteHeader lang={lang} dict={dict} />

      <main className="flex-1">
        <div className="relative overflow-hidden border-b border-saffron/12 bg-cream/50 dark:bg-card/40">
          <MandalaMark
            className="pointer-events-none absolute -top-24 -right-20 w-72 text-saffron/10"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="text-xs font-semibold tracking-widest text-saffron-deep uppercase dark:text-gold">
              {dict.legal.eyebrow}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-indigo-deep sm:text-4xl dark:text-foreground">
              {format(doc.title, values)}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {format(doc.summary, values)}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {dict.legal.updated}: {updatedLabel}
            </p>
          </div>
        </div>

        <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          {children ??
            doc.sections.map((section, index) => (
              <section
                key={section.heading || `intro-${index}`}
                className="mb-8 last:mb-0"
              >
                {section.heading ? (
                  <h2 className="font-heading text-xl font-semibold text-indigo-deep dark:text-foreground">
                    {format(section.heading, values)}
                  </h2>
                ) : null}

                {section.body?.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="mt-3 leading-relaxed text-muted-foreground"
                  >
                    {format(paragraph, values)}
                  </p>
                ))}

                {section.bullets?.length ? (
                  <ul className="mt-3 list-disc space-y-2 ps-5 text-muted-foreground marker:text-saffron">
                    {section.bullets.map((item, i) => (
                      <Bullet
                        key={typeof item === "string" ? item.slice(0, 40) : i}
                        item={item}
                        values={values}
                      />
                    ))}
                  </ul>
                ) : null}

                {section.contact ? <ContactBlock dict={dict} /> : null}
              </section>
            ))}

          <nav
            aria-label={dict.legal.more}
            className="mt-12 border-t border-border/60 pt-6"
          >
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {dict.legal.more}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((link) => (
                <li key={link.key}>
                  <Link
                    href={localised(lang, link.href)}
                    className="inline-flex rounded-full border border-saffron/25 px-3.5 py-1.5 text-sm text-saffron-deep transition-colors hover:border-saffron hover:bg-saffron/8 dark:text-saffron"
                  >
                    {dict.nav[link.key]}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={`/${lang}`}
              className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-saffron-deep dark:hover:text-saffron"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {dict.legal.backHome}
            </Link>
          </nav>
        </article>
      </main>

      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}

export { ContactBlock };
