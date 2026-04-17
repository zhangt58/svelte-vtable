# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Refactor

- **Decomposed `DataTableFilters` into focused sub-components** (PRD-11). The 1,200-line
  monolith is replaced by four independently importable units under
  `src/components/filters/`:

  | File                       | Responsibility                                            |
  | -------------------------- | --------------------------------------------------------- |
  | `useFilterState.svelte.js` | `$state` composable — selections, debounce, clear helpers |
  | `FilterColumn.svelte`      | Toggle button with label, badge, chevron                  |
  | `FilterValueList.svelte`   | Checkbox list with search, sort, virtualization           |
  | `FilterDateRange.svelte`   | From/To inputs, dual-range slider, relative presets       |

  `DataTableFilters.svelte` is now a thin orchestrator of ≤ 150 lines.

  The new sub-components are exported from the package entry point so consumers can
  compose custom filter UIs:

  ```js
  import {
    FilterColumn,
    FilterValueList,
    FilterDateRange,
    useFilterState,
  } from '@zhangt58/svelte-vtable';
  ```

### Breaking Changes

- **`useFilterState` composable API** — internal filter state management that was
  previously private to `DataTableFilters.svelte` is now a public composable. The
  function signature uses _getter functions_ for reactive props:

  ```js
  // new – pass getter functions so Svelte's reactivity tracks them inside $effect
  useFilterState({
    columnFilters: () => columnFilters,
    activeFilters: () => activeFilters,
    emitDebounce: () => emitDebounce,
    onfilter: () => onfilter,
  });
  ```

- **Sort state is now per-`FilterValueList` instance** — `sortModes`, `sortDirs`, and
  `searchQueries` were previously tracked at `DataTableFilters` level with a shared
  `sortedValuesMap`. They are now internal state inside each `FilterValueList` component.
  Any code that relied on accessing or persisting those maps externally must be updated.

- **`loadedOptions` map removed from `DataTableFilters`** — the "Load options" gate for
  large option sets is now managed internally by each `FilterValueList` instance.
  External state-restoring code that referenced `loadedOptions` must be removed.

### Performance

- **Memoized `normalizeColWidths` in `DataTable`** — the result is now stored in a `$derived`
  (`colWidthMap`) that only recomputes when `columns` changes. Previously the function was invoked
  twice per column on every render cycle (once for `<colgroup>`, once for `<th>`).

- **Memoized `getSortedValues` in `DataTableFilters`** — all per-column sorted-value lists are
  now computed once via a single `$derived.by()` map (`sortedValuesMap`) keyed by `column.key`.
  Previously `getSortedValues(column)` was called inline inside `{#each columnFilters}` on every
  render.

### Breaking Changes

#### CSS Custom Properties replace hard-coded green accent

All accent-coloured elements (active pagination button, active filter badge, filter button active
state, dual-range slider) now read their colours from CSS custom properties instead of hard-coded
Tailwind green utilities. The visual defaults are **unchanged** (the variables default to the same
green values), but if your project previously relied on overriding the specific Tailwind classes
(`bg-green-100`, `text-green-600`, `border-green-500`, etc.) to customise colours, those overrides
will no longer work. Use the new CSS custom properties instead:

```css
:root {
  --vtable-color-accent: #16a34a; /* active element colour */
  --vtable-color-accent-light: #dcfce7; /* active element background */
  --vtable-color-accent-border: #22c55e; /* active element border */
  --vtable-color-accent-text: #15803d; /* active element text */
  --vtable-color-danger: #dc2626;
  --vtable-color-info: #3b82f6; /* dual-range slider */
  --vtable-radius: 0.375rem;
  --vtable-row-height: 2.25rem;
}
```

See the **Theming** section in `README.md` for full details and a scoped-override example.

#### Unified `columns` prop replaces legacy `visibleKeys`, `colWidths`, and `rowSnippet`

The `DataTable` component now requires a single `columns: ColumnDef[]` prop. The
`visibleKeys`, `colWidths`, and `rowSnippet` props have been **removed**.

| Removed prop  | Replacement                          |
| ------------- | ------------------------------------ |
| `visibleKeys` | `columns[].key`                      |
| `colWidths`   | `columns[].width`                    |
| `rowSnippet`  | `columns[].cellSnippet` (per-column) |

**Before:**

```svelte
<DataTable
  items={rows}
  visibleKeys={['id', 'name', 'department']}
  colWidths={{ id: 1, name: 3, department: 2 }}
  {rowSnippet}
/>
```

**After:**

```js
const columns = [
  { key: 'id', label: 'ID', width: 1 },
  { key: 'name', label: 'Name', width: 3 },
  { key: 'department', label: 'Department', width: 2 },
];
```

```svelte
<DataTable {items} {columns} />
```

Custom cell rendering is now done per-column via the `cellSnippet` field of a `ColumnDef`
instead of a single `rowSnippet` covering all columns.

#### `buildColumnFilters` now requires `ColumnDef[]`

The `buildColumnFilters` utility previously accepted legacy column objects with a `type`
field (`{ key, label, type }`). It now only accepts `ColumnDef` objects using the
`filterType` field. Update any calls that pass the old format.

**Before:**

```js
const filterColumns = [
  { key: 'department', label: 'Department' },
  { key: 'hireDate', label: 'Hire Date', type: 'daterange' },
];
const columnFilters = buildColumnFilters(data, filterColumns);
```

**After:**

```js
const columns = [
  { key: 'department', label: 'Department', filterType: 'value' },
  { key: 'hireDate', label: 'Hire Date', filterType: 'daterange' },
];
const columnFilters = buildColumnFilters(data, columns);
```

### Added

- **CSS custom properties theming** — `--vtable-color-accent`, `--vtable-color-accent-light`,
  `--vtable-color-accent-border`, `--vtable-color-accent-text`, `--vtable-color-danger`,
  `--vtable-color-info`, `--vtable-radius`, and `--vtable-row-height` are now defined in
  `styles.css`. Set any of them on `:root` or a wrapper element to re-theme the library without
  modifying Tailwind configuration.
- **`examples/ThemedExample.svelte`** — live theming demo with green, purple, orange, and rose
  presets showing how to switch the accent colour at runtime.
- **`ColumnDef` interface** — a single unified column definition object that replaces the
  separate `visibleKeys`, `colWidths`, and filter-column arrays. Export it from
  `@zhangt58/svelte-vtable` as a JSDoc `@typedef`.
- **`columns` prop on `DataTable`** — accepts `ColumnDef[]` to configure visible columns,
  widths, sort behaviour, and custom header/cell rendering.
- **Auto row rendering** — when `columns` is provided, `DataTable` renders a default `<tr>`
  using each column's optional `cellSnippet` or the raw value, so no custom `rowSnippet` is
  needed for standard use cases.

---

## [0.1.0]

### Breaking Changes

All callback props have been renamed to follow the `on<EventName>` camelCase convention. The old prop names are **removed** — update your code using the migration guide below.

| Component           | Old name         | New name          | New payload                   |
| ------------------- | ---------------- | ----------------- | ----------------------------- |
| `DataTable`         | `selectCallback` | `onselect`        | `{ item, index }`             |
| `DataTable`         | `sortCallback`   | `onsort`          | `{ key, dir }`                |
| `DataTableControls` | `pagechange`     | `onpage`          | `{ page }`                    |
| `DataTableControls` | `searchchange`   | `onsearch`        | `{ search }`                  |
| `DataTableControls` | `filterstoggle`  | `onfilterstoggle` | `{ visible }`                 |
| `DataTableControls` | `perpagechange`  | `onperpage`       | `{ perPage }`                 |
| `DataTableFilters`  | `filterChange`   | `onfilter`        | `{ key, values, allFilters }` |
| `DataTableFilters`  | `sortChange`     | `oncolumnsort`    | `{ key, mode, dir }`          |

Note the payload key renames for the filter callback: `columnKey` → `key`, `selectedValues` → `values`.

### Added

- `sortKey` and `sortDir` props on `DataTable` are now `$bindable()`, so parents can use `bind:sortKey` and `bind:sortDir` to observe or control sort state.
- `onsort({ key, dir })` callback prop on `DataTable` — called whenever the sort state changes. When provided, local sorting is skipped (server-side sort pattern).
- `onselect({ item, index })` callback prop on `DataTable`.
- `onpage({ page })` callback prop on `DataTableControls`.
- `onsearch({ search })` callback prop on `DataTableControls`.
- `onfilterstoggle({ visible })` callback prop on `DataTableControls`.
- `onperpage({ perPage })` callback prop on `DataTableControls`.
- `onfilter({ key, values, allFilters })` callback prop on `DataTableControls` and `DataTableFilters`.
- `oncolumnsort({ key, mode, dir })` callback prop on `DataTableFilters`.

### Fixed

- `DataTable` no longer mutates the `items` prop. Sorting is now applied via an internal `$derived` array (`sortedItems`) which is passed to `VirtualList`, leaving the original `items` prop untouched.

### Migration Guide

#### DataTable

**Before:**

```svelte
<DataTable
  sortCallback={(key) => { /* ... */ }}
  selectCallback={({ item, index }) => { /* handle selection */ }}
>
```

**After (local sort — no callback needed):**

```svelte
<DataTable
  bind:sortKey={ui.sortKey}
  bind:sortDir={ui.sortDir}
  onselect={({ item, index }) => { /* handle selection */ }}
>
```

**After (server-side sort):**

```svelte
<DataTable
  bind:sortKey={ui.sortKey}
  bind:sortDir={ui.sortDir}
  onsort={({ key, dir }) => { /* fetch sorted data from server */ }}
  onselect={({ item, index }) => { /* handle selection */ }}
>
```

#### DataTableControls

**Before:**

```svelte
<DataTableControls
  pagechange={(e) => (ui.currentPage = e.currentPage)}
  searchchange={(e) => (ui.searchQuery = e.search)}
  filterstoggle={({ filtersVisible }) => console.log(filtersVisible)}
  perpagechange={({ perPage }) => console.log(perPage)}
  filterChange={({ columnKey, selectedValues, allFilters }) => (activeFilters = allFilters)}
/>
```

**After:**

```svelte
<DataTableControls
  onpage={({ page }) => (ui.currentPage = page)}
  onsearch={({ search }) => (ui.searchQuery = search)}
  onfilterstoggle={({ visible }) => console.log(visible)}
  onperpage={({ perPage }) => console.log(perPage)}
  onfilter={({ key, values, allFilters }) => (activeFilters = allFilters)}
/>
```

#### DataTableFilters

**Before:**

```svelte
<DataTableFilters
  filterChange={({ columnKey, selectedValues, allFilters }) => (activeFilters = allFilters)}
  sortChange={({ columnKey, mode, dir }) => console.log(columnKey, mode, dir)}
/>
```

**After:**

```svelte
<DataTableFilters
  onfilter={({ key, values, allFilters }) => (activeFilters = allFilters)}
  oncolumnsort={({ key, mode, dir }) => console.log(key, mode, dir)}
/>
```
