/**
 * Keystroke-level guards for the registration form.
 *
 * lib/schema.js stays the authority — these only stop a visitor from typing
 * what the schema would reject anyway, so a digit in a name is never entered
 * rather than reported back afterwards. Every filter runs on each keystroke
 * and on paste, so all of them must be safe on a half-typed value: none may
 * reject, they only remove.
 */

/** Everything a written name never contains. */
const NOT_IN_NAME = /[^\p{L}\p{M}\s.'-]/gu;

export function filterName(value) {
  return (
    value
      .replace(NOT_IN_NAME, "")
      // A name opens with a letter, so leading punctuation cannot be typed.
      .replace(/^[\s.'-]+/, "")
      // Runs collapse to one, but a single trailing space stays typeable so
      // the visitor can go on to their surname.
      .replace(/\s+/g, " ")
      .slice(0, 80)
  );
}

/**
 * Digits only, wide enough to hold a pasted "+91 98765 43210" (12 digits once
 * the punctuation is gone) — the schema strips the country code from there.
 */
export function filterMobile(value) {
  return value.replace(/\D/g, "").slice(0, 12);
}

/** A whole number: no sign, no decimal point, no exponent. */
export function filterWholeNumber(value, maxDigits) {
  const digits = String(value).replace(/\D/g, "");
  return maxDigits ? digits.slice(0, maxDigits) : digits;
}

/** An address has no whitespace; the schema lowercases it on submit. */
export function filterEmail(value) {
  return value.replace(/\s+/g, "").slice(0, 254);
}
