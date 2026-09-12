import { formatINR, groupInviteFor } from "./config";
import { getDictionary, defaultLocale, format } from "./i18n";
import { receiptFilename } from "./receipt";
import { receiptUrl } from "./receipt-token";
import {
  createSubscriber,
  getWhatsAppConfig,
  isWhatsAppPaused,
  sendDocument,
  sendText,
  sendTemplate,
} from "./whatsapp";

/**
 * Everything this app sends over WhatsApp, and the record of whether it
 * arrived.
 *
 * Everything here is currently PAUSED (see `isWhatsAppPaused`) — CCAvenue
 * emails the traveller their receipt on a successful payment, so the send
 * functions below return null without contacting BotBiz and without recording
 * a failed attempt against the registration.
 *
 * Nothing in here is allowed to throw. It runs on the payment-response path,
 * where the customer's browser is waiting mid-redirect: a WhatsApp outage must
 * never turn a successful payment into an error page. Failures are recorded on
 * the registration as attempts so the coordinator can see who to follow up
 * with by hand.
 */

function attempt(kind, to, promise) {
  return promise
    .then(() => ({ kind, to, ok: true, at: new Date() }))
    .catch((error) => ({
      kind,
      to,
      ok: false,
      error: String(error?.message || error).slice(0, 300),
      at: new Date(),
    }));
}

/** Locale the visitor registered in, as recorded when they left for the gateway. */
function localeOf(registration) {
  return registration?.meta?.locale === "en" ? "en" : "hi";
}

/** What the traveller still owes the coordinator, if the row records it. */
function balanceOf(registration) {
  return registration?.fee?.balanceDue ?? 0;
}

export function buildConfirmationMessage(registration, lang = defaultLocale, receipt = null) {
  const dict = getDictionary(lang);
  const config = getWhatsAppConfig();
  const balance = balanceOf(registration);

  const body = format(dict.whatsapp.confirmation, {
    name: registration.primary?.name || "",
    orderId: registration.orderId,
    travellers: registration.travellerCount,
    amount: formatINR(registration.amount),
    // Someone who has paid only the advance must not read "confirmed" and
    // assume there is nothing left to pay.
    balanceLine:
      balance > 0
        ? format(dict.whatsapp.balanceLine, { balance: formatINR(balance) })
        : "",
  });

  /* Youth and family run separate groups, so the category's own link comes
     first; WHATSAPP_GROUP_INVITE_URL stays as a single override for a yatra
     that runs one group for everyone. */
  const groupUrl =
    groupInviteFor(registration.type) || config?.groupInviteUrl || "";
  const invite = groupUrl
    ? "\n\n" + format(dict.whatsapp.groupInvite, { url: groupUrl })
    : "";

  /* A link, and not only the attachment sent alongside it. The PDF goes as a
     session message and so reaches only the minority of travellers who have
     written to the business number in the last 24 hours; a link in the message
     body reaches everyone, including whoever the approved template goes to. */
  const receiptLine = receipt
    ? "\n\n" + format(dict.whatsapp.receiptLine, { url: receipt })
    : "";

  return body + receiptLine + invite;
}

export function buildCoordinatorMessage(registration) {
  const dict = getDictionary(defaultLocale);
  const coach = registration.coach
    ? dict.admin.coaches[registration.coach] || registration.coach
    : null;

  return format(dict.whatsapp.adminAlert, {
    orderId: registration.orderId,
    name: registration.primary?.name || "",
    phone: registration.primary?.phone || "",
    travellers: registration.travellerCount,
    amount: formatINR(registration.amount),
    balance: formatINR(balanceOf(registration)),
    coachLine: coach ? format(dict.whatsapp.adminCoachLine, { coach }) : "",
    type: dict.admin.types[registration.type] || registration.type,
  });
}

/**
 * Confirmation to the traveller plus an alert to the coordinator, sent once a
 * payment is confirmed.
 *
 * Returns the `notifications` patch to merge into the registration. The caller
 * decides when to write it; this function only talks to BotBiz.
 */
export async function sendPaymentConfirmation(
  registration,
  lang = localeOf(registration)
) {
  // Paused, not broken: returning null records no attempt at all, so the admin
  // dashboard shows these registrations as paused rather than as failed sends.
  if (isWhatsAppPaused()) return null;

  const config = getWhatsAppConfig();
  if (!config) {
    return {
      confirmationSent: false,
      groupInviteSent: false,
      receiptSent: false,
      adminAlertSent: false,
      attempts: [
        { kind: "confirmation", ok: false, error: "whatsapp_not_configured", at: new Date() },
      ],
    };
  }

  const to = registration.primary?.whatsapp || registration.primary?.phone;

  /* Signed rather than stored, so it costs nothing to mint here and a failure
     to build it must not cost the traveller their confirmation. */
  const receipt = await receiptUrl(registration.orderId).catch(() => null);
  const message = buildConfirmationMessage(registration, lang, receipt);

  // Best-effort: makes the traveller findable in the BotBiz dashboard for the
  // pre-departure broadcasts, and is expected to fail for repeat registrants.
  await createSubscriber(to, registration.primary?.name).catch(() => null);

  const attempts = [];

  // A registrant who has never messaged the business number is outside the
  // 24-hour session window, so the approved template is tried first whenever
  // one is configured, with the plain text send as the fallback.
  let delivered = false;

  if (config.confirmationTemplateId) {
    const result = await attempt(
      "confirmation_template",
      to,
      sendTemplate(to, config.confirmationTemplateId, [
        registration.primary?.name || "",
        registration.orderId,
        String(registration.travellerCount),
        formatINR(registration.amount),
      ])
    );
    attempts.push(result);
    delivered = result.ok;
  }

  if (!delivered) {
    const result = await attempt("confirmation_text", to, sendText(to, message));
    attempts.push(result);
    delivered = result.ok;
  }

  /* The receipt as an actual WhatsApp attachment. Best-effort and last:
     /whatsapp/send/file is a session message, so it only lands for someone
     inside the 24-hour window — everyone else already has the link above.
     Sending the PDF outside that window needs a template with a document
     header, which has to be approved in BotBiz first. */
  let receiptSent = false;
  if (receipt) {
    const result = await attempt(
      "receipt_document",
      to,
      sendDocument(to, {
        url: receipt,
        filename: receiptFilename(registration),
        caption: `Receipt ${registration.orderId}`,
      })
    );
    attempts.push(result);
    receiptSent = result.ok;
  }

  let adminAlertSent = false;
  if (config.coordinatorNumber) {
    const result = await attempt(
      "coordinator_alert",
      config.coordinatorNumber,
      sendText(config.coordinatorNumber, buildCoordinatorMessage(registration))
    );
    attempts.push(result);
    adminAlertSent = result.ok;
  }

  return {
    confirmationSent: delivered,
    groupInviteSent: delivered && Boolean(config.groupInviteUrl),
    receiptSent,
    adminAlertSent,
    attempts,
  };
}

/**
 * Shouts at the coordinator when a "Success" comes back for an amount or
 * currency we never asked for — the one response-tampering case the
 * integration guide tells every merchant to check for.
 */
export async function sendAmountMismatchAlert(registration, response) {
  // Paused with the rest of WhatsApp. The mismatch is still written to the
  // server log and flagged in the admin dashboard by `payment.amountMismatch`.
  if (isWhatsAppPaused()) return null;

  const config = getWhatsAppConfig();
  if (!config?.coordinatorNumber) return null;

  const dict = getDictionary(defaultLocale);
  const text = format(dict.whatsapp.mismatchAlert, {
    orderId: registration.orderId,
    expected: formatINR(registration.amount),
    received: `${response.currency || "?"} ${response.amount || "?"}`,
    trackingId: response.tracking_id || "—",
  });

  return attempt("mismatch_alert", config.coordinatorNumber, sendText(config.coordinatorNumber, text));
}
