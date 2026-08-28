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
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MandalaMark, LotusMark } from "@/components/site/ornaments";
import { Button } from "@/components/ui/button";
import { PayNowButton } from "@/components/payment/pay-now-button";
import { getRegistrations } from "@/lib/db";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { formatINR } from "@/lib/config";
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

        <div className="relative mx-auto w-full max-w-lg px-4 py-16 sm:px-6 sm:py-20">
          <div
            className={`rounded-3xl bg-card/90 p-6 text-center shadow-xl shadow-saffron/8 ring-1 backdrop-blur-sm sm:p-8 ${view.ring}`}
          >
            <span
              className={`mx-auto flex size-16 items-center justify-center rounded-full ${view.bubble}`}
            >
              <Icon className="size-8" aria-hidden="true" />
            </span>

            <h1 className="mt-5 font-heading text-2xl font-bold text-indigo-deep sm:text-3xl dark:text-foreground">
              {dict.status[titleKey]}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {dict.status[bodyKey]}
            </p>

            <dl className="mt-7 text-left">
              <Row label={dict.status.orderId} value={registration.orderId} mono />
              <Row
                label={dict.status.travellers}
                value={registration.travellerCount}
              />
              {registration.fee?.total ? (
                <Row
                  label={dict.status.totalFee}
                  value={formatINR(registration.fee.total)}
                />
              ) : null}
              <Row
                label={
                  status === "success"
                    ? dict.status.advancePaid
                    : dict.status.advanceDue
                }
                value={formatINR(registration.amount)}
              />
              {balanceDue > 0 ? (
                <Row
                  label={dict.status.balance}
                  value={formatINR(balanceDue)}
                />
              ) : null}
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

            {balanceDue > 0 ? (
              <p className="mt-4 rounded-lg bg-gold/10 px-3 py-2 text-xs leading-relaxed text-saffron-deep dark:text-gold">
                {dict.status.balanceNote}
              </p>
            ) : null}

            {/* WhatsApp confirmations are paused; the gateway emails the
                receipt itself, so that is what the traveller is pointed at. */}
            {status === "success" ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-tulsi/10 px-3 py-2.5 text-left text-xs leading-relaxed text-tulsi">
                <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {dict.status.emailNote}
              </p>
            ) : null}

            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-saffron/8 px-3 py-2 text-xs text-saffron-deep dark:text-gold">
              <Copy className="size-3" aria-hidden="true" />
              {dict.status.saveNote}
            </p>

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
              className="mt-6 h-11 w-full rounded-xl"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {dict.status.backHome}
            </Button>
          </div>

          <LotusMark className="mx-auto mt-8 w-12 text-saffron/45" />
        </div>
      </main>

      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
