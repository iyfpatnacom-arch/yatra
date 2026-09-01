import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowLeft,
  Copy,
  Ban,
  Mail,
  MessageCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MandalaMark, LotusMark } from "@/components/site/ornaments";
import { Button } from "@/components/ui/button";
import { PayNowButton } from "@/components/payment/pay-now-button";
import { getRegistrations } from "@/lib/db";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { formatINR, groupInviteFor } from "@/lib/config";
import { isPaymentConfigured } from "@/lib/ccavenue";

export const dynamic = "force-dynamic";

const PRESENTATION = {
  success: {
    icon: CheckCircle2,
    ring: "ring-tulsi/40",
    bubble: "bg-tulsi/15 text-tulsi",
    titleKey: "successTitle",
    bodyKey: "successBody",
  },
  pending: {
    icon: Clock3,
    ring: "ring-gold/45",
    bubble: "bg-gold/18 text-saffron-deep dark:text-gold",
    titleKey: "pendingTitle",
    bodyKey: "pendingBody",
  },
  failed: {
    icon: XCircle,
    ring: "ring-destructive/35",
    bubble: "bg-destructive/12 text-destructive",
    titleKey: "failedTitle",
    bodyKey: "failedBody",
  },
  aborted: {
    icon: Ban,
    ring: "ring-muted-foreground/25",
    bubble: "bg-muted text-muted-foreground",
    titleKey: "abortedTitle",
    bodyKey: "abortedBody",
  },
};

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`text-right text-sm font-semibold text-foreground ${mono ? "font-mono tracking-tight" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function StatusPage({ params }) {
  const { lang: rawLang, orderId } = await params;
  const lang = normalizeLocale(rawLang);
  const dict = getDictionary(lang);

  const registrations = await getRegistrations();
  const registration = await registrations.findOne(
    { orderId },
    // Never project the ID-proof references onto a page reachable by link.
    {
      projection: {
        orderId: 1,
        type: 1,
        amount: 1,
        fee: 1,
        travellerCount: 1,
        "payment.status": 1,
        "payment.trackingId": 1,
        "payment.paymentMode": 1,
        "primary.name": 1,
      },
    }
  );

  if (!registration) notFound();

  const status = registration.payment?.status || "pending";
  const balanceDue = registration.fee?.balanceDue ?? 0;
  const view = PRESENTATION[status] || PRESENTATION.pending;
  const Icon = view.icon;

  // Only offer to pay when there is a live gateway to send them to — otherwise
  // the pending copy explains that payment opens later instead.
  const canPay = status !== "success" && isPaymentConfigured();

  /* The group is where the yatra is actually run from, so a confirmed seat is
     the moment to hand it over — and only then: an unpaid registration has no
     seat to coordinate yet. */
  const groupUrl = status === "success" ? groupInviteFor(registration.type) : null;

  // "Payment will be enabled shortly" is the wrong thing to say directly above
  // a working Pay button.
  const titleKey =
    canPay && status === "pending" ? "pendingPayTitle" : view.titleKey;
  const bodyKey =
    canPay && status === "pending" ? "pendingPayBody" : view.bodyKey;

  return (
    <>
      <SiteHeader lang={lang} dict={dict} />

      <main className="relative flex-1 overflow-hidden">
        <MandalaMark className="pointer-events-none absolute -top-32 left-1/2 w-[32rem] -translate-x-1/2 text-saffron/12" />

        <div className="relative mx-auto w-full max-w-lg px-4 py-16 sm:px-6 sm:py-20 lg:max-w-4xl lg:py-10">
          <div
            className={`rounded-md bg-card/90 p-6 shadow-xl shadow-saffron/8 ring-1 backdrop-blur-sm sm:p-8 lg:p-10 ${view.ring}`}
          >
            {/* Phones keep the stacked column — a receipt reads fine scrolled.
                From lg the outcome and its actions move alongside the details
                so the whole registration is on screen at once. Row/column
                placement keeps the source order (outcome, details, actions)
                intact for the stacked layout. */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-10">
              <div className="text-center lg:col-start-1 lg:row-start-1 lg:text-left">
                <span
                  className={`mx-auto flex size-16 items-center justify-center rounded-full lg:mx-0 ${view.bubble}`}
                >
                  <Icon className="size-8" aria-hidden="true" />
                </span>

                <h1 className="mt-5 font-heading text-2xl font-bold text-indigo-deep sm:text-3xl dark:text-foreground">
                  {dict.status[titleKey]}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {dict.status[bodyKey]}
                </p>
              </div>

              {/* Spans both rows of the left column so the rule between the two
                  halves runs the full height of the card. */}
              <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border/60 lg:pl-10">
                <dl className="mt-7 text-left lg:mt-0">
                  <Row
                    label={dict.status.orderId}
                    value={registration.orderId}
                    mono
                  />
                  <Row
                    label={dict.status.travellers}
                    value={registration.travellerCount}
                  />
                  <Row
                    label={
                      status === "success"
                        ? dict.status.advancePaid
                        : dict.status.advanceDue
                    }
                    value={formatINR(registration.amount)}
                  />
                  {registration.payment?.trackingId ? (
                    <Row
                      label={dict.status.paymentRef}
                      value={registration.payment.trackingId}
                      mono
                    />
                  ) : null}
                  {registration.payment?.paymentMode ? (
                    <Row
                      label={dict.status.paymentMode}
                      value={registration.payment.paymentMode}
                    />
                  ) : null}
                </dl>
                {/* WhatsApp confirmations are paused; the gateway emails the
                    receipt itself, so that is what the traveller is pointed at. */}
                {status === "success" ? (
                  <p className="mt-4 flex items-start gap-2 rounded-md bg-tulsi/10 px-3 py-2.5 text-left text-xs leading-relaxed text-tulsi">
                    <Mail
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {dict.status.emailNote}
                  </p>
                ) : null}

                <p className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-saffron/8 px-3 py-2 text-center text-xs text-saffron-deep dark:text-gold">
                  <Copy className="size-3 shrink-0" aria-hidden="true" />
                  {dict.status.saveNote}
                </p>
              </div>

              <div className="text-center lg:col-start-1 lg:row-start-2 lg:text-left">
                {groupUrl ? (
                  <div className="mt-6">
                    <a
                      href={groupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-yatra-whatsapp-pulse flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] text-base font-medium text-white shadow-lg shadow-[#25D366]/25 transition-colors hover:bg-[#1da851] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      {dict.status.joinGroup}
                    </a>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {dict.status.joinGroupNote}
                    </p>
                  </div>
                ) : null}

                {canPay ? (
                  <PayNowButton
                    orderId={registration.orderId}
                    lang={lang}
                    dict={dict}
                    label={
                      status === "pending"
                        ? dict.status.payNow
                        : dict.status.retryPayment
                    }
                  />
                ) : null}

                <Button
                  render={<Link href={`/${lang}`} />}
                  variant="outline"
                  className="mt-6 h-11 w-full rounded-md"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {dict.status.backHome}
                </Button>
              </div>
            </div>
          </div>

          <LotusMark className="mx-auto mt-8 w-12 text-saffron/45 lg:mt-6" />
        </div>
      </main>

      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
