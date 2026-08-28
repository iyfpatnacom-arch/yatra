/**
 * Browser-side half of the CCAvenue handoff.
 *
 * CCAvenue's billing page is reached by POSTing `encRequest` and the access
 * code to it, which a redirect cannot do — so the browser builds a throwaway
 * form and submits itself. The encrypted payload is minted server-side by
 * /api/payment/initiate; nothing here can influence what is being charged.
 */

function submitToGateway(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * On success the browser is already navigating away, so callers should stop
 * and leave their loading state on. On failure the returned `error` is a
 * dictionary key for the caller to translate.
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

  if (!response.ok || !result?.ok || !result.action) {
    return { ok: false, error: result?.error || "payment_failed_start" };
  }

  submitToGateway(result.action, result.fields);
  return { ok: true };
}
