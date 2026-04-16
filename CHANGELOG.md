# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Breaking Changes

- **`sortCallback` prop removed from `DataTable`.**  
  Replace `sortCallback={(key) => ...}` with `onsort={({ key, dir }) => ...}`.  
  The new `onsort` callback receives an object `{ key: string, dir: 'asc' | 'desc' }` instead of a bare key string.

- **All callback props have been renamed** to follow the `on<EventName>` camelCase convention (see full rename map below). The old names still work for one release cycle but emit a `console.warn` deprecation notice.

### Added

- `sortKey` and `sortDir` props on `DataTable` are now `$bindable()`, so parents can use `bind:sortKey` and `bind:sortDir` to observe or control sort state.
- New `onsort({ key, dir })` callback prop on `DataTable` — called whenever the sort state changes (column header clicked). When `onsort` is provided, local sorting is skipped to support the server-side sort pattern.
- New `onselect({ item, index })` callback prop on `DataTable` (replaces `selectCallback`).
- New `onpage({ page })` callback prop on `DataTableControls` (replaces `pagechange`).
- New `onsearch({ search })` callback prop on `DataTableControls` (replaces `searchchange`).
- New `onfilterstoggle({ visible })` callback prop on `DataTableControls` (replaces `filterstoggle`).
- New `onperpage({ perPage })` callback prop on `DataTableControls` (replaces `perpagechange`).
- New `onfilter({ key, values, allFilters })` callback prop on `DataTableControls` and `DataTableFilters` (replaces `filterChange`).
- New `oncolumnsort({ key, mode, dir })` callback prop on `DataTableFilters` (replaces `sortChange`).

### Fixed

- `DataTable` no longer mutates the `items` prop. Sorting is now applied via an internal `$derived` array (`sortedItems`) which is passed to `VirtualList`, leaving the original `items` prop untouched. This fixes silent sort-state loss on parent re-renders and aligns with Svelte 5 unidirectional data flow.

### Migration Guide

#### Callback Rename Map

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

> **Note:** The old names are still accepted for one release cycle but will log a `console.warn` deprecation notice. They will be removed in the next major version.

#### DataTable

**Before:**

```svelte
<DataTable
  {items}
  sortKey={ui.sortKey}
  sortDir={ui.sortDir}
  sortCallback={(key) => {
    if (ui.sortKey === key) {
      ui.sortDir = ui.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      ui.sortKey = key;
      ui.sortDir = 'asc';
    }
    // optionally fetch sorted data from server
  }}
  selectCallback={({ item, index }) => { /* handle selection */ }}
>
```

**After (local sort — no callback needed):**

```svelte
<DataTable
  {items}
  bind:sortKey={ui.sortKey}
  bind:sortDir={ui.sortDir}
  onselect={({ item, index }) => { /* handle selection */ }}
>
```

**After (server-side sort):**

```svelte
<DataTable
  {items}
  bind:sortKey={ui.sortKey}
  bind:sortDir={ui.sortDir}
  onsort={({ key, dir }) => {
    // fetch sorted data from server and update items
  }}
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
