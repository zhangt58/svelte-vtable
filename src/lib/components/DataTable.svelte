<script>
  import { VirtualList } from 'svelte-virtuallists';
  import ColumnHeaderFilter from './filters/ColumnHeaderFilter.svelte';
  import { useFilterState } from './filters/useFilterState.svelte.js';
  import {
    DEFAULT_RELATIVE_RANGE_PRESETS,
    applyFilters,
    hasActiveFilterValue,
    resolveColumnFilters,
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
    // inlineFilters is true, configs are derived from filterItems or this component's items.
    columnFilters = null,
    // Base data source used to build inline filter option lists when columnFilters is omitted.
    filterItems = null,
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
    // Row density: 'comfortable' (default) or 'compact' (tighter cell padding).
    density = 'comfortable',
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

  // --- Sticky columns ---
  // Header cell widths of sticky columns, measured (bind:offsetWidth), so the
  // offsets hold whatever the width type (stretch weight or CSS length).
  let stickyWidths = $state({});

  // key → { side, offset, edge } for columns with `sticky: 'left' | 'right'`.
  // A left column's offset is the width of the left sticky columns before it;
  // a right column's, of the right sticky columns after it. `edge` marks the
  // innermost column of each side, which draws the divider shadow.
  const stickyMap = $derived.by(() => {
    const map = {};
    const left = columns.filter((c) => c.sticky === 'left');
    const right = columns.filter((c) => c.sticky === 'right').reverse();
    let acc = 0;
    left.forEach((c, i) => {
      map[c.key] = { side: 'left', offset: acc, edge: i === left.length - 1 };
      acc += stickyWidths[c.key] ?? 0;
    });
    acc = 0;
    right.forEach((c, i) => {
      map[c.key] = { side: 'right', offset: acc, edge: i === right.length - 1 };
      acc += stickyWidths[c.key] ?? 0;
    });
    return map;
  });

  function stickyClass(key) {
    const st = stickyMap[key];
    if (!st) return '';
    return `vtable-sticky vtable-sticky-${st.side}${st.edge ? ` vtable-sticky-edge-${st.side}` : ''}`;
  }

  // A column's minimum width: ColumnDef.minWidth, else a CSS-length width.
  // Set on the header content, it is a real minimum (a <col> width is only a
  // hint under automatic table layout), so wide tables scroll sideways
  // instead of squeezing their columns.
  function minWidthStyle(key) {
    const c = colDefMap[key];
    const w =
      c?.minWidth ??
      (typeof c?.width === 'string' && !c.width.trim().endsWith('%') ? c.width : null);
    return w ? `min-width: ${w};` : '';
  }

  function stickyStyle(key) {
    const st = stickyMap[key];
    return st ? `${st.side}: ${st.offset}px;` : '';
  }

  // Horizontal scroll position, so the sticky edges cast a shadow only while
  // columns are scrolled under them.
  let scroller = $state(null);
  let scrolledFromStart = $state(false);
  let scrolledToEnd = $state(true);

  function updateHorizontalScroll() {
    if (!scroller) return;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    scrolledFromStart = scrollLeft > 0;
    scrolledToEnd = scrollLeft + clientWidth >= scrollWidth - 1;
  }

  $effect(() => {
    if (!scroller || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateHorizontalScroll);
    ro.observe(scroller);
    const table = scroller.querySelector('table');
    if (table) ro.observe(table);
    updateHorizontalScroll();
    return () => ro.disconnect();
  });

  const effectiveColumnFilters = $derived.by(() => {
    return resolveColumnFilters({
      columnFilters,
      columns,
      filterItems: Array.isArray(filterItems) ? filterItems : items,
      activeFilters,
      enabled: inlineFilters,
    });
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

<section
  class="virtual-data-table {className}"
  {style}
  bind:this={scroller}
  onscroll={updateHorizontalScroll}
  data-scrolled-start={scrolledFromStart ? '' : undefined}
  data-scrolled-end={scrolledToEnd ? undefined : ''}
>
  {#if columns.length > 0}
    <!-- When `virtualize` is false we instruct VirtualList to render as a normal list/table
         by setting `isDisabled`. This ensures pagination based on item counts shows the
         exact number of rows expected (useful when rows have variable height). -->
    <VirtualList
      items={Array.isArray(sortedItems) ? sortedItems : []}
      isTable
      isDisabled={!virtualize}
      class="datatable-table max-w-full max-h-full overflow-auto{density === 'compact'
        ? ' compact'
        : ''}"
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
                style="width: {calcColWidth(key)}; {stickyStyle(key)}"
                class="select-none {stickyClass(key)}{filterDef && openFilterKey === filterDef.key
                  ? ' vtable-filter-open'
                  : ''}"
                bind:offsetWidth={stickyWidths[key]}
                aria-sort={sortKey === key
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'}
              >
                <div class="vtable-header-content" style={minWidthStyle(key) || undefined}>
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
            <td class={stickyClass(col.key) || undefined} style={stickyStyle(col.key) || undefined}>
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
    {#if !sortedItems || sortedItems.length === 0}
      <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
    {/if}
  {:else}
    <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
  {/if}
</section>

<style>
  @import '../styles.css';
</style>
