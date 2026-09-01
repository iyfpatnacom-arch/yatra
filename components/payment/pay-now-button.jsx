"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startPayment } from "@/lib/payment-redirect";
import { translateError } from "@/lib/i18n";

/**
 * Re-opens the CCAvenue billing page for a registration that has not been paid
 * for — a declined card, a cancelled checkout, a dropped connection. The
 * registration and its ID stay the same; only the payment attempt is new.
 */
export function PayNowButton({ orderId, lang, dict, label }) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    const result = await startPayment({ orderId, lang });
    // On success the browser is already leaving for the gateway, so the button
    // stays in its loading state rather than flashing back to idle.
    if (result.ok) return;

    setBusy(false);
    toast.error(translateError(dict, result.error));
  }

  return (
    <Button
      type="button"
      onClick={pay}
      disabled={busy}
      size="lg"
      className="mt-6 h-12 w-full rounded-md bg-gradient-to-r from-saffron to-saffron-deep text-base shadow-lg shadow-saffron/20 hover:from-saffron-deep hover:to-saffron"
    >
      {busy ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {dict.status.redirecting}
        </>
      ) : (
        <>
          <CreditCard className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}
