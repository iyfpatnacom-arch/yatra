import crypto from "node:crypto";

/**
 * CCAvenue non-seamless (billing page) integration.
 *
 * Flow: we encrypt the order into `encRequest`, the browser POSTs it together
 * with the plain access code to CCAvenue, the customer pays on CCAvenue's own
 * billing page, and CCAvenue POSTs an encrypted `encResp` back to
 * /api/payment/response. Card details never touch this server, which is what
 * keeps us out of PCI DSS scope.
 *
 * Two encryption schemes ship in the official Node kit and a merchant account
 * is provisioned for exactly one of them, so the scheme — and the transaction
 * URL that goes with it — is configuration, not a guess:
 *
 *   aes128  MD5(workingKey) as the key, fixed IV, AES-128-CBC, hex.  (classic)
 *   aes256  the 32-byte workingKey, random 12-byte IV, AES-256-GCM, hex.
 */

const HOSTS = {
  test: "https://test.ccavenue.com",
  production: "https://secure.ccavenue.com",
};

/** The transaction path is tied to the encryption scheme, not chosen freely. */
const TRANSACTION_PATH = {
  aes128: "/transaction/transaction.do?command=initiateTransaction",
  aes256: "/gTransaction.do?command=initiateTransaction",
};

/** The kit's hard-coded IV: bytes 0x00 … 0x0f. */
const AES128_IV = Buffer.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
]);

/**
 * Resolves credentials, or null when payment is not configured yet. Callers
 * treat null as "skip payment" so the site keeps working on localhost, where
 * CCAvenue cannot reach us anyway.
 */
export function getCcavenueConfig() {
  const merchantId = (process.env.CCAVENUE_MERCHANT_ID || "").trim();
  const accessCode = (process.env.CCAVENUE_ACCESS_CODE || "").trim();
  const workingKey = (process.env.CCAVENUE_WORKING_KEY || "").trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!merchantId || !accessCode || !workingKey || !siteUrl) return null;

  const mode =
    process.env.CCAVENUE_ENCRYPTION === "aes256" ? "aes256" : "aes128";
  if (mode === "aes256" && Buffer.byteLength(workingKey, "utf8") !== 32) {
    throw new Error(
      "CCAVENUE_WORKING_KEY must be exactly 32 bytes when CCAVENUE_ENCRYPTION=aes256."
    );
  }

  // Defaults to the test gateway on purpose: forgetting to set this should
  // send money nowhere, not somewhere real.
  const environment =
    process.env.CCAVENUE_ENV === "production" ? "production" : "test";

  const endpoint =
    (process.env.CCAVENUE_ENDPOINT || "").trim() ||
    HOSTS[environment] + TRANSACTION_PATH[mode];

  return {
    merchantId,
    accessCode,
    workingKey,
    mode,
    environment,
    endpoint,
    siteUrl,
  };
}

export function isPaymentConfigured() {
  try {
    return Boolean(getCcavenueConfig());
  } catch {
    return false;
  }
}

// ── Encryption ──────────────────────────────────────────────────────────────

function aes128Key(workingKey) {
  // The raw 16-byte MD5 digest, exactly as the PHP/Java/Node kits use it.
  return crypto.createHash("md5").update(workingKey, "utf8").digest();
}

export function encrypt(plainText, workingKey, mode = "aes128") {
  if (mode === "aes256") {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", workingKey, iv);
    const body = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    return (
      iv.toString("hex") +
      Buffer.concat([body, cipher.getAuthTag()]).toString("hex")
    );
  }

  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    aes128Key(workingKey),
    AES128_IV
  );
  return cipher.update(plainText, "utf8", "hex") + cipher.final("hex");
}

export function decrypt(encryptedHex, workingKey, mode = "aes128") {
  const clean = String(encryptedHex).trim();

  if (mode === "aes256") {
    const buffer = Buffer.from(clean, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      workingKey,
      buffer.subarray(0, 12)
    );
    decipher.setAuthTag(buffer.subarray(-16));
    return Buffer.concat([
      decipher.update(buffer.subarray(12, -16)),
      decipher.final(),
    ]).toString("utf8");
  }

  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    aes128Key(workingKey),
    AES128_IV
  );
  return decipher.update(clean, "hex", "utf8") + decipher.final("utf8");
}

// ── Request building ────────────────────────────────────────────────────────

/**
 * CCAvenue rejects a whole transaction over one stray character (errors
 * 31004–31011), so every value is filtered down to the character set the
 * integration guide allows and cut to its documented length.
 */
function clean(value, pattern, maxLength) {
  return String(value ?? "")
    .replace(pattern, "")
    .trim()
    .slice(0, maxLength);
}

const ALPHA_SPACE = /[^A-Za-z ]/g;
const DIGITS = /[^0-9]/g;
const EMAIL_CHARS = /[^A-Za-z0-9@._-]/g;
const PARAM_CHARS = /[^A-Za-z0-9#,().\-/ ]/g;

/**
 * Names only allow letters and spaces, so a stripped character becomes a space
 * rather than vanishing — "Sharma-Devi" should reach the billing page as
 * "Sharma Devi", not "SharmaDevi".
 */
function cleanName(value, maxLength) {
  return String(value ?? "")
    .replace(ALPHA_SPACE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** CCAvenue's billing page renders in the language we ask for. */
function billingLanguage(lang) {
  return lang === "hi" ? "HI" : "EN";
}

/**
 * Builds the auto-submitting form's payload for one registration.
 *
 * The amount comes from the stored document, never from the browser: the
 * registration row is the only authority on what this booking costs.
 */
export function buildPaymentRequest(registration, { lang = "hi", config } = {}) {
  const settings = config || getCcavenueConfig();
  if (!settings) throw new Error("CCAvenue is not configured.");

  const primary = registration.primary || {};

  const fields = {
    merchant_id: settings.merchantId,
    order_id: registration.orderId,
    currency: registration.currency || "INR",
    amount: Number(registration.amount).toFixed(2),
    redirect_url: `${settings.siteUrl}/api/payment/response`,
    cancel_url: `${settings.siteUrl}/api/payment/cancel`,
    language: billingLanguage(lang),
    // Optional, but CCAvenue checks it for uniqueness for 24 hours, which
    // stops a double-submitted browser form becoming two live transactions.
    tid: String(Date.now()),
    billing_name: cleanName(primary.name, 60),
    billing_tel: clean(primary.phone, DIGITS, 20),
    billing_email: clean(primary.email, EMAIL_CHARS, 70),
    billing_country: "India",
    // Echoed back to us in the response, so the handler knows the category,
    // the head-count and which language to return the visitor to.
    merchant_param1: clean(registration.type, PARAM_CHARS, 100),
    merchant_param2: String(registration.travellerCount || 1),
    merchant_param3: lang === "en" ? "en" : "hi",
  };

  const plain = new URLSearchParams(fields).toString();

  return {
    action: settings.endpoint,
    fields: {
      encRequest: encrypt(plain, settings.workingKey, settings.mode),
      access_code: settings.accessCode,
    },
  };
}

// ── Response handling ───────────────────────────────────────────────────────

/** Decrypts `encResp` into a plain object of the documented response fields. */
export function parseGatewayResponse(encResp, config) {
  const decrypted = decrypt(encResp, config.workingKey, config.mode);
  return Object.fromEntries(new URLSearchParams(decrypted).entries());
}

/** CCAvenue's `order_status` → the four statuses this app stores. */
export function mapOrderStatus(orderStatus) {
  switch (String(orderStatus || "").trim().toLowerCase()) {
    case "success":
      return "success";
    case "aborted":
      return "aborted";
    case "failure":
    case "invalid":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Turns a decrypted response into the `payment` sub-document.
 *
 * `amountMismatch` implements the integration guide's headline best practice:
 * never trust the amount and currency that come back — compare them with what
 * we recorded before the customer left for the gateway.
 */
export function toPaymentUpdate(response, registration) {
  const status = mapOrderStatus(response.order_status);
  const returnedAmount = Number(response.amount);
  const expectedAmount = Number(registration.amount);

  const amountMismatch =
    status === "success" &&
    (!Number.isFinite(returnedAmount) ||
      Math.abs(returnedAmount - expectedAmount) > 0.009 ||
      (response.currency || "INR") !== (registration.currency || "INR"));

  return {
    status,
    provider: "ccavenue",
    trackingId: response.tracking_id || null,
    bankRefNo: response.bank_ref_no || null,
    paymentMode: response.payment_mode || null,
    // status_message is the bank's chatter ("Y") on a good payment, so it only
    // earns a place on the row when something actually went wrong.
    failureMessage:
      status === "success"
        ? null
        : response.failure_message || response.status_message || null,
    paidAt: status === "success" ? new Date() : null,
    amountMismatch,
    raw: response,
  };
}
