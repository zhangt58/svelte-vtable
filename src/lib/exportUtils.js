/**
 * Utility functions for exporting table rows (e.g. the current view) to CSV
 */

/**
 * Sort rows the way DataTable sorts locally: natural, case-insensitive string
 * comparison, empty values (null/undefined) last in either direction.
 * Returns a new array; the input is not modified.
 * @param {Array<Object>} items
 * @param {string|null|undefined} key - Column key to sort by; falsy keeps the order.
 * @param {string} [dir='asc'] - `'asc'` or `'desc'`.
 * @returns {Array<Object>}
 */
export function sortItems(items, key, dir = 'asc') {
  const rows = Array.isArray(items) ? [...items] : [];
  if (!key) return rows;
  return rows.sort((a, b) => {
    const aVal = a?.[key];
    const bVal = b?.[key];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const comparison = String(aVal).localeCompare(String(bVal), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    return dir === 'desc' ? -comparison : comparison;
  });
}

/**
 * Plain value of one cell for export: ColumnDef.exportValue when given, else
 * the raw row value.
 * @param {Object} item
 * @param {{key: string, exportValue?: Function}} column
 * @returns {unknown}
 */
export function getExportValue(item, column) {
  const value = item?.[column.key];
  return typeof column.exportValue === 'function' ? column.exportValue(item, value) : value;
}

/**
 * Columns that take part in an export: all but those with `exportable: false`.
 * @param {Array<{key: string, exportable?: boolean}>} columns
 * @returns {Array<Object>}
 */
export function getExportColumns(columns) {
  return (Array.isArray(columns) ? columns : []).filter((c) => c && c.exportable !== false);
}

/**
 * Turn a cell value into text: empty for null/undefined, ISO for dates,
 * '; '-joined for arrays, JSON for other objects.
 * @param {unknown} value
 * @returns {string}
 */
function stringifyValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  if (Array.isArray(value)) return value.map(stringifyValue).join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Byte order mark that tells Excel the file is UTF-8 (written as a code point:
// formatters turn a \uFEFF escape into an invisible literal).
const UTF8_BOM = String.fromCharCode(0xfeff);

// Text a spreadsheet would run as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Escape one cell for CSV (RFC 4180): quote it when it holds the delimiter,
 * a quote, a line break or edge whitespace, doubling inner quotes.
 * @param {unknown} value
 * @param {{delimiter?: string, escapeFormulas?: boolean}} [options]
 * @returns {string}
 */
export function escapeCSVValue(value, { delimiter = ',', escapeFormulas = true } = {}) {
  let text = stringifyValue(value);
  // Only text values: a negative number is data, not a formula.
  if (escapeFormulas && typeof value === 'string' && FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  const needsQuotes =
    text.includes(delimiter) || text.includes('"') || /[\r\n]/.test(text) || text !== text.trim();
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Build CSV text from rows and column definitions. The header row uses
 * `exportLabel ?? label ?? key`; columns with `exportable: false` are left out.
 * @param {Array<Object>} rows
 * @param {Array<Object>} columns - ColumnDef[] (only `key`, `label`, `exportLabel`,
 *   `exportValue` and `exportable` are read).
 * @param {Object} [options]
 * @param {string} [options.delimiter=','] - Field separator (e.g. `';'` or `'\t'`).
 * @param {boolean} [options.header=true] - Include the header row.
 * @param {string} [options.lineEnding='\r\n']
 * @param {boolean} [options.escapeFormulas=true] - Prefix text starting with
 *   `= + - @` (or a tab / carriage return) with `'` so spreadsheets do not run it.
 * @returns {string}
 */
export function toCSV(rows, columns, options = {}) {
  const { delimiter = ',', header = true, lineEnding = '\r\n', escapeFormulas = true } = options;
  const cols = getExportColumns(columns);
  const cell = (value) => escapeCSVValue(value, { delimiter, escapeFormulas });
  const lines = [];
  if (header) {
    lines.push(cols.map((c) => cell(String(c.exportLabel ?? c.label ?? c.key))).join(delimiter));
  }
  for (const item of Array.isArray(rows) ? rows : []) {
    lines.push(cols.map((c) => cell(getExportValue(item, c))).join(delimiter));
  }
  return lines.join(lineEnding);
}

/**
 * Let the browser save CSV text as a file.
 * @param {string} csv
 * @param {string} [filename='export.csv']
 * @param {Object} [options]
 * @param {boolean} [options.bom=true] - Prepend a UTF-8 byte order mark so
 *   Excel reads non-ASCII text correctly.
 */
export function downloadCSV(csv, filename = 'export.csv', { bom = true } = {}) {
  if (typeof document === 'undefined') throw new Error('downloadCSV needs a browser document');
  const blob = new Blob([bom ? UTF8_BOM : '', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled, or some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Build CSV from rows and columns and save it as a file.
 * @param {Array<Object>} rows
 * @param {Array<Object>} columns
 * @param {Object} [options] - `filename` (default `'export.csv'`), `bom`, and the
 *   `toCSV` options.
 * @returns {string} The CSV text.
 */
export function exportCSV(rows, columns, options = {}) {
  const { filename = 'export.csv', bom = true, ...csvOptions } = options;
  const csv = toCSV(rows, columns, csvOptions);
  downloadCSV(csv, filename, { bom });
  return csv;
}
