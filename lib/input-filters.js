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
 * The ten digits after the fixed "+91" the field shows. A pasted
 * "+91 98765 43210" or "098765 43210" loses its prefix here, so the country
 * code can never end up typed twice. Only a value longer than ten digits is
 * trimmed: a real number may itself start with 91.
 */
export function filterMobile(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** A whole number: no sign, no decimal point, no exponent. */
export function filterWholeNumber(value, maxDigits) {
  const digits = String(value).replace(/\D/g, "");
  return maxDigits ? digits.slice(0, maxDigits) : digits;
}

/**
 * A postal address in English letters, since it is printed on a receipt whose
 * fonts have no Devanagari. Line breaks fold into spaces: the field is one
 * line.
 */
export function filterAddress(value, maxLength) {
  return value
    .replace(/[^A-Za-z0-9\s,./#()'&:-]/g, "")
    .replace(/^[\s,./#()'&:-]+/, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/** An address has no whitespace; the schema lowercases it on submit. */
export function filterEmail(value) {
  return value.replace(/\s+/g, "").slice(0, 254);
}
