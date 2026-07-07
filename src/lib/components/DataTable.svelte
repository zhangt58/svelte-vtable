<script>
  import { VirtualList } from 'svelte-virtuallists';
  import ColumnHeaderFilter from './filters/ColumnHeaderFilter.svelte';
  import { useFilterState } from './filters/useFilterState.svelte.js';
  import {
    DEFAULT_RELATIVE_RANGE_PRESETS,
    applyFilters,
    buildColumnFilters,
    hasActiveFilterValue,
  } from '../filterUtils.js';

  // Runic props: accept props via $props() so the component matches the
  // project's runes-style components. Include the `select` callback prop.
  let {
    items = [],
    // Unified column definitions array (required).
    // @type {import('../index.js').ColumnDef[]}
    columns = [],
    // sortKey/sortDir are bindable so parents can observe or control sort state.
    sortKey = $bindable(null),
    sortDir = $bindable('asc'),
    className = '',
    style = '',
    emptyMessage = 'No items to display.',
    selected = null,
    // onselect({ item, index }) — called when a row is selected
    onselect = undefined,
    // onsort({ key, dir }) is called whenever sort changes.
    // When provided, no local sorting is applied (server-side sort pattern).
    onsort = undefined,
    // Render per-column filter controls in table headers.
    inlineFilters = false,
    // Filter configs can be provided from all source rows. When omitted and
    // inlineFilters is true, configs are derived from this component's items.
    columnFilters = null,
    activeFilters = {},
    // onfilter({ key, values, allFilters }) makes filtering parent-managed.
    // When omitted, inline filters are applied locally to this table's items.
    onfilter = undefined,
    oncolumnsort = undefined,
    showCounts = true,
    virtualThreshold = 500,
    virtualItemHeight = 36,
    virtualOverscan = 5,
    populateThreshold = 200,
    emitDebounce = 100,
    relativeRangePresets = DEFAULT_RELATIVE_RANGE_PRESETS,
    // Allow consumers to disable virtualization (useful when paginating by fixed item counts).
    // If `virtualize` is false we ask the wrapped VirtualList to render as a normal list/table
    // by setting its `isDisabled` prop. Default: true (virtualization enabled).
    virtualize = true,
  } = $props();

  // --- Derived values from ColumnDef[] ---

  // Keys of columns to display.
  const effectiveVisibleKeys = $derived(columns.map((c) => c.key));

  // Width configuration: build an object keyed by column key.
  const effectiveColWidths = $derived(
    Object.fromEntries(columns.map((c) => [c.key, c.width ?? 1])),
  );

  // Fast lookup map: key → ColumnDef.
  const colDefMap = $derived(Object.fromEntries(columns.map((c) => [c.key, c])));

  const effectiveColumnFilters = $derived.by(() => {
    if (Array.isArray(columnFilters)) return columnFilters;
    if (!inlineFilters) return [];
    return buildColumnFilters(items, columns);
  });

  const filterDefMap = $derived(
    Object.fromEntries(effectiveColumnFilters.map((filter) => [filter.key, filter])),
  );

  const filterState = useFilterState({
    columnFilters: () => effectiveColumnFilters,
    activeFilters: () => activeFilters || {},
    emitDebounce: () => emitDebounce,
    onfilter: () => onfilter,
  });

  let openFilterKey = $state(null);

  const filteredItems = $derived.by(() => {
    if (!inlineFilters || onfilter !== undefined) return items;
    return applyFilters(items, filterState.selections);
  });

  // Internal sorted array derived from items + current sort state.
  // When onsort is provided the parent manages sorting (server-side), so we
  // pass items through unchanged. Otherwise we sort locally.
  const sortedItems = $derived.by(() => {
    if (onsort !== undefined || !sortKey) return filteredItems;

    const key = sortKey;
    const dir = sortDir;
    return [...filteredItems].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Convert to strings for comparison
      const aStr = String(aVal);
      const bStr = String(bVal);

      // Alphabetical comparison
      const comparison = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return dir === 'asc' ? comparison : -comparison;
    });
  });

  // expose selection via the callback prop (if provided)
  function selectItem(item, index) {
    selected = item;
    try {
      if (onselect !== undefined) {
        onselect({ item, index });
      }
    } catch (err) {
      try {
        console.error('onselect threw:', err);
      } catch (e) {}
    }
  }

  // When a header is clicked, toggle/update sortKey and sortDir, then notify
  // the parent via onsort. Parents using bind:sortKey / bind:sortDir will
  // receive the updated values automatically.
  function handleSort(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
    try {
      if (onsort) onsort({ key: sortKey, dir: sortDir });
    } catch (err) {
      try {
        console.error('onsort threw:', err);
      } catch (e) {}
    }
  }

  function toggleFilter(key) {
    openFilterKey = openFilterKey === key ? null : key;
  }

  function closeFilter() {
    openFilterKey = null;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') closeFilter();
  }

  function handleColumnFilterSort(columnKey, { mode, dir }) {
    try {
      if (oncolumnsort) /** @type {any} */ (oncolumnsort)({ key: columnKey, mode, dir });
    } catch (err) {
      try {
        console.debug('oncolumnsort threw', err);
      } catch (e) {}
    }
  }

  // Normalize colWidths: treat numeric values as stretch weights and pass through CSS strings.
  // Memoized: only recomputes when effectiveVisibleKeys or effectiveColWidths changes.
  const colWidthMap = $derived(normalizeColWidths());

  function normalizeColWidths() {
    const map = {};
    const keys = effectiveVisibleKeys;
    const widths = effectiveColWidths;

    const numeric = [];
    const otherStrings = [];

    for (const key of keys) {
      const v = widths[key];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        numeric.push({ key, w: v });
      } else if (typeof v === 'string') {
        const s = v.trim();
        if (!s.endsWith('%')) {
          otherStrings.push({ key, v: s });
        }
        // percent strings are intentionally unsupported — ignore silently
      }
    }

    const totalWeight = numeric.reduce((s, r) => s + r.w, 0);
    const availablePct = 100;

    if (numeric.length > 0 && totalWeight > 0) {
      let acc = 0;
      numeric.forEach((n, idx) => {
        const pct =
          idx === numeric.length - 1
            ? Math.max(0, Math.round((availablePct - acc) * 100) / 100)
            : Math.round((n.w / totalWeight) * availablePct * 100) / 100;
        map[n.key] = `${pct}%`;
        acc += pct;
      });
    }

    // Copy through non-percent CSS strings (e.g. '120px')
    for (const o of otherStrings) {
      map[o.key] = o.v;
    }

    return map;
  }

  // Compute column width by key (fallback to even distribution)
  function calcColWidth(key) {
    if (colWidthMap[key] !== undefined) return String(colWidthMap[key]);
    const n = Math.max(1, effectiveVisibleKeys.length);
    return Math.floor(100 / n) + '%';
  }
</script>

<svelte:window onclick={closeFilter} onkeydown={handleKeydown} />

<section class="virtual-data-table {className}" {style}>
  {#if sortedItems && sortedItems.length > 0}
    <!-- When `virtualize` is false we instruct VirtualList to render as a normal list/table
         by setting `isDisabled`. This ensures pagination based on item counts shows the
         exact number of rows expected (useful when rows have variable height). -->
    <VirtualList
      items={sortedItems}
      isTable
      isDisabled={!virtualize}
      class="datatable-table max-w-full max-h-full overflow-auto"
    >
      <!-- colgroup enforces the column widths so table-layout: fixed distributes as intended -->
      {#snippet header()}
        <colgroup>
          {#each effectiveVisibleKeys as key}
            <col style="width: {calcColWidth(key)}" />
          {/each}
        </colgroup>
        <thead class="sticky-header">
          <tr>
            {#each effectiveVisibleKeys as key, columnIndex}
              {@const colDef = colDefMap[key]}
              {@const filterDef = filterDefMap[key]}
              {@const label = colDef?.label ?? key}
              {@const isSortable = colDef?.sortable !== false}
              {@const selection = filterDef ? filterState.selections[filterDef.key] : undefined}
              {@const isFilterActive = hasActiveFilterValue(selection)}
              <th
                style="width: {calcColWidth(key)}"
                class="select-none"
                aria-sort={sortKey === key
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'}
              >
                <div class="vtable-header-content">
                  {#if colDef?.headerSnippet}
                    <div class="min-w-0 flex-1">
                      {@render colDef.headerSnippet({ key, label, sortKey, sortDir })}
                    </div>
                  {:else if isSortable}
                    <button
                      type="button"
                      class="vtable-header-sort-button min-w-0 flex-1 cursor-pointer"
                      onclick={() => handleSort(key)}
                    >
                      <span class="min-w-0 truncate">{label}</span>
                      {#if sortKey === key}
                        <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      {/if}
                    </button>
                  {:else}
                    <span class="min-w-0 flex-1 truncate">{label}</span>
                  {/if}

                  {#if inlineFilters && filterDef}
                    <ColumnHeaderFilter
                      column={filterDef}
                      {selection}
                      isOpen={openFilterKey === filterDef.key}
                      isActive={isFilterActive}
                      align={columnIndex > effectiveVisibleKeys.length / 2 ? 'right' : 'left'}
                      {showCounts}
                      {virtualThreshold}
                      {virtualItemHeight}
                      {virtualOverscan}
                      {populateThreshold}
                      {relativeRangePresets}
                      ontoggle={() => toggleFilter(filterDef.key)}
                      onclear={() => filterState.clearColumn(filterDef.key)}
                      onvaluetoggle={(value) => filterState.toggleSelection(filterDef.key, value)}
                      oncheckall={(values) => filterState.checkAll(filterDef.key, values)}
                      oninvert={(values) => filterState.invertSelection(filterDef.key, values)}
                      onchecknone={() => filterState.checkNone(filterDef.key)}
                      ondaterangechange={(updated) =>
                        filterState.updateDateRange(filterDef.key, updated)}
                      onsortchange={(payload) => handleColumnFilterSort(filterDef.key, payload)}
                    />
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
      {/snippet}

      {#snippet vl_slot({ index, item })}
        <!-- Default row rendering using each column's cellSnippet or raw value -->
        <tr onclick={() => selectItem(item, index)} class={selected === item ? 'selected' : ''}>
          {#each columns as col}
            <td>
              {#if col.cellSnippet}
                {@render col.cellSnippet({ item, value: item[col.key], index })}
              {:else}
                {item[col.key] ?? ''}
              {/if}
            </td>
          {/each}
        </tr>
      {/snippet}
    </VirtualList>
  {:else}
    <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
  {/if}
</section>

<style>
  @import '../styles.css';
</style>
