# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Breaking Changes

- **`sortCallback` prop removed from `DataTable`.**  
  Replace `sortCallback={(key) => ...}` with `onsort={({ key, dir }) => ...}`.  
  The new `onsort` callback receives an object `{ key: string, dir: 'asc' | 'desc' }` instead of a bare key string.

### Added

- `sortKey` and `sortDir` props on `DataTable` are now `$bindable()`, so parents can use `bind:sortKey` and `bind:sortDir` to observe or control sort state.
- New `onsort({ key, dir })` callback prop on `DataTable` — called whenever the sort state changes (column header clicked). When `onsort` is provided, local sorting is skipped to support the server-side sort pattern.

### Fixed

- `DataTable` no longer mutates the `items` prop. Sorting is now applied via an internal `$derived` array (`sortedItems`) which is passed to `VirtualList`, leaving the original `items` prop untouched. This fixes silent sort-state loss on parent re-renders and aligns with Svelte 5 unidirectional data flow.

### Migration Guide

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
>
```

**After (local sort — no callback needed):**

```svelte
<DataTable
  {items}
  bind:sortKey={ui.sortKey}
  bind:sortDir={ui.sortDir}
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
>
```
