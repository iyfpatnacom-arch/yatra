/**
 * BotBiz WhatsApp client.
 *
 * BotBiz answers with HTTP 200 for both outcomes and puts the verdict in the
 * body as status "1" or "0", so every call goes through `call()` and a "0" is
 * turned into a thrown Error — callers should never have to remember that.
 *
 * Session vs template: a plain text message only reaches someone who wrote to
 * the business number in the last 24 hours. A registrant who has never
 * messaged us is outside that window, which is what the optional template path
 * below is for.
 */

const DEFAULT_API_URL = "https://dash.botbiz.io/api/v1";

/**
 * Master switch, and deliberately opt-IN.
 *
 * WhatsApp messaging is paused: CCAvenue already emails the traveller a
 * receipt the moment a payment succeeds, so a second confirmation over
 * WhatsApp is duplicate noise and burns template credits. Set
 * WHATSAPP_ENABLED=true to bring it back — every credential below is still
 * read, so resuming is one variable, not a code change.
 */
export function isWhatsAppPaused() {
  return String(process.env.WHATSAPP_ENABLED || "").trim().toLowerCase() !== "true";
}

export function getWhatsAppConfig() {
  if (isWhatsAppPaused()) return null;

  const apiToken = (process.env.BOTBIZ_API_KEY || "").trim();
  const phoneNumberId = (process.env.BOTBIZ_PHONE_NUMBER_ID || "").trim();
  if (!apiToken || !phoneNumberId) return null;

  return {
    apiToken,
    phoneNumberId,
    apiUrl: (process.env.BOTBIZ_API_URL || DEFAULT_API_URL)
      .trim()
      .replace(/\/+$/, ""),
    /* BotBiz's OWN numeric template id, from /whatsapp/get/template/list —
       not the template name, and not Meta's template_id. See sendTemplate. */
    confirmationTemplateId: (process.env.BOTBIZ_TEMPLATE_ID || "").trim(),
    groupInviteUrl: (process.env.WHATSAPP_GROUP_INVITE_URL || "").trim(),
    coordinatorNumber: normalizeWhatsAppNumber(
      process.env.COORDINATOR_WHATSAPP || ""
    ),
  };
}

export function isWhatsAppConfigured() {
  return Boolean(getWhatsAppConfig());
}

/**
 * BotBiz wants a bare international number: country code, digits only, no "+".
 * Registrations store 10-digit Indian mobiles, so 91 is prefixed here rather
 * than being baked into the stored data.
 */
export function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

async function call(path, params, { timeoutMs = 10000 } = {}) {
  const config = getWhatsAppConfig();
  if (!config) throw new Error("BotBiz is not configured.");

  const body = new URLSearchParams({ apiToken: config.apiToken, ...params });

  const response = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      `BotBiz ${path} returned non-JSON (HTTP ${response.status}): ${text.slice(0, 200)}`
    );
  }

  // BotBiz uses "1"/1/true for success and carries the reason in `message`.
  const ok = result.status === "1" || result.status === 1 || result.status === true;
  if (!ok) {
    const reason =
      typeof result.message === "string" ? result.message : "unknown error";
    throw new Error(`BotBiz ${path} failed: ${reason}`);
  }

  return result;
}

/** Session text message — only lands inside the 24-hour service window. */
export async function sendText(phoneNumber, message) {
  const config = getWhatsAppConfig();
  const to = normalizeWhatsAppNumber(phoneNumber);
  if (!to) throw new Error(`Not a usable WhatsApp number: ${phoneNumber}`);

  return call("/whatsapp/send", {
    phone_number_id: config.phoneNumberId,
    phone_number: to,
    message,
  });
}

/**
 * Pre-approved template message, for recipients outside the 24-hour window.
 *
 * BotBiz's published documentation describes templates but never gives the
 * endpoint or its parameters — that page is a form generator. The shape below
 * was established by probing the live API against this account:
 *
 *   - the path really is /whatsapp/send/template;
 *   - it identifies the template by `template_id`, and that means BotBiz's OWN
 *     numeric id (the `id` field of /whatsapp/get/template/list), NOT the
 *     template name and NOT Meta's `template_id` — both of those come back
 *     "Message template not found";
 *   - no language parameter is wanted; the template carries its own locale.
 *
 * A template with no variables sends on those four fields alone, confirmed.
 * `body_variables` is still the one guess here: no template on this account
 * has a placeholder yet, so there was nothing to verify it against. It is only
 * sent when there are variables to send, so a template without them — which is
 * what works today — is unaffected by the guess.
 */
export async function sendTemplate(phoneNumber, templateId, variables = []) {
  const config = getWhatsAppConfig();
  const to = normalizeWhatsAppNumber(phoneNumber);
  if (!to) throw new Error(`Not a usable WhatsApp number: ${phoneNumber}`);

  return call("/whatsapp/send/template", {
    phone_number_id: config.phoneNumberId,
    phone_number: to,
    template_id: templateId,
    // Body placeholders {{1}}, {{2}}, … in template order.
    ...(variables.length ? { body_variables: JSON.stringify(variables) } : {}),
  });
}

/**
 * Sends a document (the receipt PDF) by handing BotBiz a public HTTPS link,
 * which WhatsApp then downloads for itself.
 *
 * A link rather than an upload on purpose: the receipt route is already public
 * and unauthenticated — the registration ID is the credential — so uploading
 * the same bytes through /whatsapp/upload/media first would be a second
 * network round trip on the payment-response path for no gain.
 *
 * `/api/receipt/BRAJ-Y-123` carries no ".pdf" extension, and BotBiz requires
 * `media_type` whenever the URL has none. `media_name` is what WhatsApp prints
 * under the paperclip, so it must be a filename the traveller recognises.
 *
 * Session message: this only lands for someone who wrote to the business
 * number in the last 24 hours. Delivery to everyone else needs a template with
 * a document header — see sendTemplate.
 */
export async function sendDocument(phoneNumber, { url, filename, caption }) {
  const config = getWhatsAppConfig();
  const to = normalizeWhatsAppNumber(phoneNumber);
  if (!to) throw new Error(`Not a usable WhatsApp number: ${phoneNumber}`);

  return call("/whatsapp/send/file", {
    phone_number_id: config.phoneNumberId,
    phone_number: to,
    media_url: url,
    media_type: "document",
    media_name: filename,
    ...(caption ? { media_caption_text: caption } : {}),
  });
}

/** Interactive reply buttons — session message, same 24-hour rule as text. */
export async function sendButtons(phoneNumber, message, buttons, extra = {}) {
  const config = getWhatsAppConfig();
  const to = normalizeWhatsAppNumber(phoneNumber);
  if (!to) throw new Error(`Not a usable WhatsApp number: ${phoneNumber}`);

  return call("/whatsapp/send/interactive-buttons", {
    phone_number_id: config.phoneNumberId,
    phone_number: to,
    message,
    buttons: JSON.stringify(buttons.slice(0, 3)),
    ...extra,
  });
}

/**
 * Adds the traveller to the BotBiz contact list so the coordinator can find
 * and broadcast to them from the dashboard later. Best-effort by design: an
 * already-existing subscriber is reported as a failure by BotBiz, and that is
 * not a reason to fail a registration.
 */
export async function createSubscriber(phoneNumber, name) {
  const config = getWhatsAppConfig();
  const to = normalizeWhatsAppNumber(phoneNumber);
  if (!to) return null;

  return call("/whatsapp/subscriber/create", {
    phoneNumberID: config.phoneNumberId,
    name: String(name || "Yatri").slice(0, 60),
    phoneNumber: to,
  }).catch(() => null);
}
