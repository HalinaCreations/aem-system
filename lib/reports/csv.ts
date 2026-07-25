export type CsvCell = string | number | null | undefined;

/**
 * Serialise to RFC 4180 CSV.
 *
 * Values are quoted whenever they contain a delimiter, quote, or newline, and
 * embedded quotes are doubled — a counselor's free-text note with a comma in it
 * must not shift every following column.
 *
 * Leading =, +, -, @ are prefixed with a quote so spreadsheet software treats
 * them as text rather than formulas. Exported rows can contain names and notes
 * typed by users, and a cell starting with "=" is a formula-injection vector
 * the moment someone opens the file in Excel.
 */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))];
  return lines.join("\r\n");
}

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Filename-safe slug plus an ISO date, e.g. risk-roster_sy-2025-2026_2026-07-25.csv */
export function reportFilename(base: string, schoolYearLabel: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug(base)}_${slug(schoolYearLabel)}_${date}.csv`;
}
