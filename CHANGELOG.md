# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Breaking Changes

#### Unified `columns` prop replaces legacy `visibleKeys`, `colWidths`, and `rowSnippet`

The `DataTable` component now requires a single `columns: ColumnDef[]` prop. The
`visibleKeys`, `colWidths`, and `rowSnippet` props have been **removed**.

| Removed prop | Replacement |
|---|---|
| `visibleKeys` | `columns[].key` |
| `colWidths` | `columns[].width` |
| `rowSnippet` | `columns[].cellSnippet` (per-column) |

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
  { key: 'id',         label: 'ID',         width: 1 },
  { key: 'name',       label: 'Name',       width: 3 },
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
  { key: 'hireDate',   label: 'Hire Date', type: 'daterange' },
];
const columnFilters = buildColumnFilters(data, filterColumns);
```

**After:**

```js
const columns = [
  { key: 'department', label: 'Department', filterType: 'value' },
  { key: 'hireDate',   label: 'Hire Date',  filterType: 'daterange' },
];
const columnFilters = buildColumnFilters(data, columns);
```

### Added

- **`ColumnDef` interface** — a single unified column definition object that replaces the
  separate `visibleKeys`, `colWidths`, and filter-column arrays. Export it from
  `@zhangt58/svelte-vtable` as a JSDoc `@typedef`.
- **`columns` prop on `DataTable`** — accepts `ColumnDef[]` to configure visible columns,
  widths, sort behaviour, and custom header/cell rendering.
- **Auto row rendering** — when `columns` is provided, `DataTable` renders a default `<tr>`
  using each column's optional `cellSnippet` or the raw value, so no custom `rowSnippet` is
  needed for standard use cases.

---

## Previous releases

### Breaking Changes (v0.1.x)

All callback props have been renamed to follow the `on<EventName>` camelCase convention. The old prop names are **removed** — update your code using the migration guide below.

| Component | Old name | New name | New payload |
|---|---|---|---|
| `DataTable` | `selectCallback` | `onselect` | `{ item, index }` |
| `DataTable` | `sortCallback` | `onsort` | `{ key, dir }` |
| `DataTableControls` | `pagechange` | `onpage` | `{ page }` |
| `DataTableControls` | `searchchange` | `onsearch` | `{ search }` |
| `DataTableControls` | `filterstoggle` | `onfilterstoggle` | `{ visible }` |
| `DataTableControls` | `perpagechange` | `onperpage` | `{ perPage }` |
| `DataTableFilters` | `filterChange` | `onfilter` | `{ key, values, allFilters }` |
| `DataTableFilters` | `sortChange` | `oncolumnsort` | `{ key, mode, dir }` |

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
