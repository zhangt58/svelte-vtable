export { default as DataTableControls } from './components/DataTableControls.svelte';
export { default as DataTableFilters } from './components/DataTableFilters.svelte';
export { default as DataTable } from './components/DataTable.svelte';

// Filter sub-components (individually importable)
export { default as FilterColumn } from './components/filters/FilterColumn.svelte';
export { default as FilterValueList } from './components/filters/FilterValueList.svelte';
export { default as FilterDateRange } from './components/filters/FilterDateRange.svelte';
export { useFilterState } from './components/filters/useFilterState.svelte.js';

// Export filter utility functions
export {
  getUniqueValuesWithCounts,
  buildColumnFilters,
  applyFilters,
  matchesDateRange,
  hasActiveFilters,
  countActiveFilters,
  clearAllFilters,
  filtersToSearchParams,
  searchParamsToFilters,
} from './filterUtils.js';

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
 * @property {boolean} [sortable] - Whether clicking the column header sorts the
 *   table. Defaults to `true`.
 * @property {'value'|'daterange'|'datetimerange'|'none'} [filterType]
 *   Filter UI to render for this column:
 *   - `'value'`         — checkbox list of unique values (default)
 *   - `'daterange'`     — date-only range picker
 *   - `'datetimerange'` — datetime range picker
 *   - `'none'`          — no filter UI for this column
 * @property {import('svelte').Snippet<[{key: string, label: string, sortKey: string|null, sortDir: string}]>} [headerSnippet]
 *   Custom Svelte 5 snippet rendered inside the `<th>`. Receives
 *   `{ key, label, sortKey, sortDir }`.
 * @property {import('svelte').Snippet<[{item: T, value: unknown, index: number}]>} [cellSnippet]
 *   Custom Svelte 5 snippet rendered inside each `<td>` for this column.
 *   Receives `{ item, value, index }`. When omitted the raw value is rendered.
 */
