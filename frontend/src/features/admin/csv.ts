/**
 * CSV export generated in the browser (no server round trip). Only the numbers already on
 * screen are exported; nothing is recomputed here.
 */
export type CsvCell = string | number | boolean | null | undefined;

/** Byte-order mark so spreadsheet applications read the file as UTF-8. */
const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Neutralise spreadsheet formula injection and quote anything that needs it.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Build a CSV document (CRLF line endings, RFC 4180 quoting). */
export function toCsv(headers: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [headers.map(escapeCell).join(","), ...rows.map((row) => row.map(escapeCell).join(","))];
  return lines.join("\r\n") + "\r\n";
}

/** File-name friendly slug (`Incidents by category` -> `incidents-by-category`). */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "export"
  );
}

/** Trigger a download of `csv` as `filename` through a temporary object URL. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
