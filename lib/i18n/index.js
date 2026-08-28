import hi from "./hi";
import en from "./en";

export const locales = ["hi", "en"];
export const defaultLocale = "hi";

const dictionaries = { hi, en };

export function isLocale(value) {
  return locales.includes(value);
}

export function normalizeLocale(value) {
  return isLocale(value) ? value : defaultLocale;
}

export function getDictionary(lang) {
  return dictionaries[normalizeLocale(lang)];
}

/** The "other" locale, used by the language switcher. */
export function otherLocale(lang) {
  return normalizeLocale(lang) === "hi" ? "en" : "hi";
}

/** Resolves a zod message key into a localised sentence. */
export function translateError(dict, key) {
  if (!key) return "";
  return dict.errors[key] || dict.errors.server_error;
}

/**
 * Fills {placeholders} in a dictionary string.
 *
 * Dictionary values must stay serialisable — a function cannot cross the
 * server/client boundary — so interpolated strings are templates plus this
 * helper rather than arrow functions.
 *
 *   format("Member {n}", { n: 2 })  ->  "Member 2"
 */
export function format(template, values = {}) {
  if (typeof template !== "string") return "";
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}
