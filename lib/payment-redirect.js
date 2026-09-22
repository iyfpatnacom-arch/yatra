/**
 * Browser-side half of the Razorpay handoff.
 *
 * /api/payment/initiate mints the Razorpay Order and the checkout options
 * server-side, so nothing here can influence what is being charged. This file
 * only loads Razorpay's checkout script and opens it. With `redirect: true`
 * Razorpay sends the customer to our callback_url when they finish, so a UPI
 * app switch or a bank page on mobile cannot lose the result.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutScript = null;

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  checkoutScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error("no Razorpay"));
    script.onerror = () => reject(new Error("checkout script failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    // Let the next tap try again rather than caching the failure.
    checkoutScript = null;
    throw error;
  });
  return checkoutScript;
}

/**
 * On success the browser is already navigating away, so callers should stop
 * and leave their loading state on. `cancelled` means the customer closed the
 * checkout; any other failure carries an `error` dictionary key for the caller
 * to translate.
 */
export async function startPayment({ orderId, lang }) {
  let response;
  try {
    response = await fetch("/api/payment/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, lang }),
    });
  } catch {
    return { ok: false, error: "network_error" };
  }

  const result = await response.json().catch(() => null);

  // Already paid (a second tab, a double tap) — go straight to the status page.
  if (result?.redirect) {
    window.location.assign(result.redirect);
    return { ok: true };
  }

  if (!response.ok || !result?.ok || !result.checkout) {
    return { ok: false, error: result?.error || "payment_failed_start" };
  }

  let Razorpay;
  try {
    Razorpay = await loadCheckout();
  } catch {
    return { ok: false, error: "network_error" };
  }

  // Resolves only if the customer closes the checkout; a finished payment
  // leaves the page for callback_url instead.
  return new Promise((resolve) => {
    const checkout = new Razorpay({
      ...result.checkout,
      redirect: true,
      modal: { ondismiss: () => resolve({ ok: false, cancelled: true }) },
    });
    checkout.open();
  });
}
