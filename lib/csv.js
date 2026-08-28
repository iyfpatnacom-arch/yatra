/**
 * Minimal RFC 4180 CSV writer.
 *
 * Two details that matter for this project:
 *  - A UTF-8 BOM is prepended, otherwise Excel on Windows mangles Devanagari
 *    names into mojibake when the file is double-clicked.
 *  - Values starting with = + - @ are prefixed with a single quote so a name
 *    or facilitator field can never execute as a spreadsheet formula.
 */

const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** U+FEFF, written as an escape so it is visible in source. */
const UTF8_BOM = "\uFEFF";

function escapeCell(value) {
  if (value === null || value === undefined) return "";

  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(columns, rows) {
  const lines = [columns.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(row[column])).join(","));
  }
  // CRLF line endings keep Excel happy.
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

export function csvFilename(prefix = "yatra-registrations") {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${prefix}-${stamp}.csv`;
}
