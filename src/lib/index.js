export { default as DataTableControls } from './components/DataTableControls.svelte';
export { default as DataTableFilters } from './components/DataTableFilters.svelte';
export { default as DataTable } from './components/DataTable.svelte';

// Filter sub-components (individually importable)
export { default as FilterColumn } from './components/filters/FilterColumn.svelte';
export { default as FilterValueList } from './components/filters/FilterValueList.svelte';
export { default as FilterDateRange } from './components/filters/FilterDateRange.svelte';
export { default as ColumnHeaderFilter } from './components/filters/ColumnHeaderFilter.svelte';
export { useFilterState } from './components/filters/useFilterState.svelte.js';

// Export filter utility functions
export {
  DEFAULT_RELATIVE_RANGE_PRESETS,
  getFilterType,
  filtersWithoutKey,
  resolveColumnFilters,
  getUniqueValuesWithCounts,
  buildColumnFilters,
  applyFilters,
  matchesDateRange,
  isDateRangeColumn,
  hasActiveFilterValue,
  countActiveFilterValue,
  hasActiveFilters,
  countActiveFilters,
  clearAllFilters,
  filtersToSearchParams,
  searchParamsToFilters,
} from './filterUtils.js';

// Export utility functions (CSV)
export {
  sortItems,
  getExportColumns,
  getExportValue,
  escapeCSVValue,
  toCSV,
  downloadCSV,
  exportCSV,
} from './exportUtils.js';

/**
 * Unified column definition for DataTable.
 * Pass an array of `ColumnDef` objects as the `columns` prop to configure
 * visible keys, widths, sorting, filters, and custom snippets from a single place.
 *
 * @template {Record<string, unknown>} [T=Record<string, unknown>]
 * @typedef {Object} ColumnDef
 * @property {string} key - Data key. Must match a property on the row item.
 * @property {string} [label] - Display label for the column header. Defaults to `key`.
 * @property {number|string} [width] - Column width: a stretch weight (number) or a
 *   CSS width value such as `'120px'`. Defaults to `1` (equal stretch).
 * @property {string} [minWidth] - Minimum column width as a CSS length (e.g. `'12rem'`).
 *   A CSS-length `width` is also a minimum. When the minimums exceed the
 *   container, the table scrolls sideways instead of squeezing its columns.
 *   Applies to the declared layout: a user may resize the column below it.
 * @property {'left'|'right'} [sticky] - Keep the column in view while the table
 *   scrolls sideways, pinned to that edge. Several columns may stick per side;
 *   offsets are measured, so any width type works.
 * @property {string} [group] - Group label shown in a header row above the
 *   column headers. Adjacent columns with the same group share one cell.
 * @property {boolean} [resizable] - Set `false` to keep this column fixed when
 *   the table is `resizable`. Defaults to `true`.
 * @property {boolean} [wrap] - Wrap long text in this column's cells; overrides
 *   the table's `wrap` prop. When false, cells stay on one line and cut-off text
 *   is shown in a tooltip.
 * @property {boolean} [sortable] - Whether clicking the column header sorts the
 *   table. Defaults to `true`.
 * @property {'value'|'list'|'daterange'|'datetimerange'|'none'} [filterType]
 *   Filter UI to render for this column:
 *   - `'value'`/`'list'` — checkbox list of unique values (default)
 *   - `'daterange'`     — date-only range picker
 *   - `'datetimerange'` — datetime range picker
 *   - `'none'`          — no filter UI for this column
 * @property {import('svelte').Snippet<[{key: string, label: string, sortKey: string|null, sortDir: string}]>} [headerSnippet]
 *   Custom Svelte 5 snippet rendered inside the `<th>`. Receives
 *   `{ key, label, sortKey, sortDir }`.
 * @property {boolean} [exportable] - Set `false` to leave the column out of CSV
 *   exports (e.g. an actions column). Defaults to `true`.
 * @property {string} [exportLabel] - CSV header for the column. Defaults to `label`.
 * @property {(item: T, value: unknown) => unknown} [exportValue] - Plain value
 *   written to CSV for this column (a `cellSnippet` cannot be exported).
 *   Defaults to the raw row value.
 * @property {import('svelte').Snippet<[{item: T, value: unknown, index: number}]>} [cellSnippet]
 *   Custom Svelte 5 snippet rendered inside each `<td>` for this column.
 *   Receives `{ item, value, index }`. When omitted the raw value is rendered.
 */
