<script>
  import { untrack } from 'svelte';
  import { VirtualList } from 'svelte-virtuallists';
  import ColumnHeaderFilter from './filters/ColumnHeaderFilter.svelte';
  import { useFilterState } from './filters/useFilterState.svelte.js';
  import {
    DEFAULT_RELATIVE_RANGE_PRESETS,
    applyFilters,
    hasActiveFilterValue,
    resolveColumnFilters,
  } from '../filterUtils.js';
  import { exportCSV as exportRowsToCSV, sortItems } from '../exportUtils.js';

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
    // Drag a header's right edge to resize its column (ColumnDef.resizable: false opts out).
    resizable = false,
    // User-set column widths in px, keyed by column key. Bindable; empty means
    // the declared widths. Once any column is resized the table switches to a
    // fixed layout whose width is the sum of the column widths.
    columnWidths = $bindable({}),
    // oncolumnresize({ key, width, widths }) — called when a resize ends.
    oncolumnresize = undefined,
    // When set, columnWidths are saved to and restored from localStorage under this key.
    storageKey = undefined,
    // Wrap long cell text (default). When false, cells stay on one line and
    // truncated text is shown in a tooltip. ColumnDef.wrap overrides per column.
    wrap = true,
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
  // Header cell widths, measured (bind:offsetWidth), so the sticky offsets hold
  // whatever the width type (stretch weight or CSS length). Also the starting
  // point of the first column resize.
  let headerWidths = $state({});

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
      acc += headerWidths[c.key] ?? 0;
    });
    acc = 0;
    right.forEach((c, i) => {
      map[c.key] = { side: 'right', offset: acc, edge: i === right.length - 1 };
      acc += headerWidths[c.key] ?? 0;
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
  function declaredMinWidth(key) {
    const c = colDefMap[key];
    return (
      c?.minWidth ??
      (typeof c?.width === 'string' && !c.width.trim().endsWith('%') ? c.width : null)
    );
  }

  function minWidthStyle(key) {
    // Under the fixed layout the column width already includes the minimum.
    if (fixedLayout) return '';
    const w = declaredMinWidth(key);
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

  // --- Resizable columns ---
  // Floor for user widths, so a column stays wide enough to grab again. A
  // declared minWidth does not apply: it sizes the declared layout only, and
  // the user may resize below it.
  const MIN_RESIZE_WIDTH = 40;
  // Width of a column that has no user width under the fixed layout and
  // declares no CSS width either (a stretch weight has no meaning there).
  const DEFAULT_FIXED_WIDTH = '10rem';
  const STORAGE_PREFIX = 'svelte-vtable:column-widths:';

  // { key, startX, startWidth } while a header edge is dragged.
  let resizing = $state(null);

  const fixedLayout = $derived(resizable && Object.keys(columnWidths ?? {}).length > 0);

  function isResizable(key) {
    return resizable && colDefMap[key]?.resizable !== false;
  }

  // Column width under the fixed layout: the user width, else the declared
  // CSS width or minimum.
  function fixedColWidth(key) {
    const px = columnWidths?.[key];
    if (typeof px === 'number' && px > 0) return `${Math.max(MIN_RESIZE_WIDTH, px)}px`;
    return declaredMinWidth(key) ?? DEFAULT_FIXED_WIDTH;
  }

  const fixedTableWidth = $derived(
    fixedLayout ? `calc(${effectiveVisibleKeys.map(fixedColWidth).join(' + ')})` : '',
  );

  function readStoredWidths(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) ?? 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeStoredWidths(key, widths) {
    try {
      if (Object.keys(widths).length === 0) localStorage.removeItem(STORAGE_PREFIX + key);
      else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(widths));
    } catch (e) {}
  }

  // Restore saved widths before the first paint (and when the key changes).
  $effect.pre(() => {
    if (!storageKey) return;
    const saved = readStoredWidths(storageKey);
    untrack(() => {
      columnWidths = saved ?? {};
    });
  });

  // Save widths when they change, but not on every pointer move of a drag.
  $effect(() => {
    if (!storageKey || resizing) return;
    writeStoredWidths(storageKey, $state.snapshot(columnWidths) ?? {});
  });

  // The first resize pins every column at its current width, so switching to
  // the fixed layout does not move the other columns.
  function ensureFixedWidths() {
    if (fixedLayout) return;
    columnWidths = Object.fromEntries(
      effectiveVisibleKeys.map((k) => [k, Math.round(headerWidths[k] ?? 0)]).filter(([, w]) => w),
    );
  }

  function setColumnWidth(key, width) {
    columnWidths = { ...columnWidths, [key]: width };
  }

  function emitResize(key) {
    try {
      if (oncolumnresize)
        oncolumnresize({ key, width: columnWidths[key], widths: $state.snapshot(columnWidths) });
    } catch (err) {
      try {
        console.error('oncolumnresize threw:', err);
      } catch (e) {}
    }
  }

  function startResize(event, key) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const th = handle.closest('th');
    ensureFixedWidths();
    handle.setPointerCapture?.(event.pointerId);
    resizing = {
      key,
      startX: event.clientX,
      startWidth: th.offsetWidth,
    };
  }

  function moveResize(event) {
    if (!resizing) return;
    const { key, startX, startWidth } = resizing;
    setColumnWidth(
      key,
      Math.max(MIN_RESIZE_WIDTH, Math.round(startWidth + event.clientX - startX)),
    );
  }

  function endResize() {
    if (!resizing) return;
    const { key } = resizing;
    resizing = null;
    emitResize(key);
  }

  // Double-clicking a header edge drops the user widths: the table returns to
  // its declared layout. (A single column has no width to return to under the
  // fixed layout when it declares only a stretch weight.)
  function resetColumnWidths(key) {
    if (!fixedLayout) return;
    columnWidths = {};
    emitResize(key);
  }

  // --- Grouped headers ---
  // Runs of adjacent columns sharing ColumnDef.group, rendered as a header row
  // above the column headers. A run is split where its columns' sticky side
  // changes, so the sticky part can stick with its columns; only the first
  // part shows the label.
  const groupSegments = $derived.by(() => {
    if (!columns.some((c) => c.group)) return [];
    const segments = [];
    for (const c of columns) {
      const group = c.group || null;
      const side = stickyMap[c.key]?.side ?? null;
      const last = segments[segments.length - 1];
      if (last && last.group === group && last.side === side) {
        last.keys.push(c.key);
      } else {
        const cont = !!last && group !== null && last.group === group;
        segments.push({ group, side, keys: [c.key], cont });
      }
    }
    return segments;
  });

  // Height of the group header row: the column header row sticks below it.
  let groupRowHeight = $state(0);

  function groupStickyKey(segment) {
    if (!segment.side) return null;
    return segment.side === 'left' ? segment.keys[0] : segment.keys[segment.keys.length - 1];
  }

  function groupClass(segment) {
    const base = segment.group
      ? `vtable-group-header${segment.cont ? ' vtable-group-cont' : ''}`
      : 'vtable-group-header vtable-group-empty';
    if (!segment.side) return base;
    const edge = segment.keys.some((k) => stickyMap[k]?.edge);
    return `${base} vtable-sticky vtable-sticky-${segment.side}${edge ? ` vtable-sticky-edge-${segment.side}` : ''}`;
  }

  // --- Truncated text ---
  function cellWraps(col) {
    return col.wrap ?? wrap;
  }

  function isTruncated(el) {
    return (
      el.clientWidth > 0 &&
      (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
    );
  }

  // On hover, give a body cell (or header label) whose text is cut off a
  // tooltip with the full text. Checks the hovered element and its ancestors
  // up to the cell, so truncation inside custom cell snippets counts too.
  function revealTruncated(event) {
    const target = /** @type {Element} */ (event.target);
    if (!target?.closest) return;
    const label = target.closest('.vtable-header-label');
    if (label) {
      setAutoTitle(label, isTruncated(label) ? label.textContent : null);
      return;
    }
    const td = target.closest('td');
    if (!td || !scroller?.contains(td)) return;
    let text = null;
    for (let el = target; el; el = el.parentElement) {
      if (isTruncated(el)) {
        text = el.textContent;
        break;
      }
      if (el === td) break;
    }
    setAutoTitle(td, text);
  }

  // Only touch titles this component set, never a consumer's.
  function setAutoTitle(el, text) {
    const full = text?.replace(/\s+/g, ' ').trim();
    if (full) {
      if (el.hasAttribute('title') && !el.hasAttribute('data-vtable-auto-title')) return;
      el.setAttribute('title', full);
      el.setAttribute('data-vtable-auto-title', '');
    } else if (el.hasAttribute('data-vtable-auto-title')) {
      el.removeAttribute('title');
      el.removeAttribute('data-vtable-auto-title');
    }
  }

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
    return sortItems(filteredItems, sortKey, sortDir);
  });

  /**
   * Save the rows this table shows — after its local filters and sort — as a
   * CSV file, with the current columns (`exportable: false` ones left out).
   * When the parent pages, filters or sorts the rows itself, `items` is only
   * what the parent passed: export the full view with `exportCSV` from the
   * package instead. Call through `bind:this`.
   * @param {Object} [options] - `filename` (default `'export.csv'`), `rows` and
   *   `columns` overrides, and the `toCSV` / `downloadCSV` options.
   * @returns {string} The CSV text.
   */
  export function exportCSV(options = {}) {
    const { rows = sortedItems, columns: exportColumns = columns, ...rest } = options;
    return exportRowsToCSV(rows, exportColumns, rest);
  }

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
    if (fixedLayout) return fixedColWidth(key);
    if (colWidthMap[key] !== undefined) return String(colWidthMap[key]);
    const n = Math.max(1, effectiveVisibleKeys.length);
    return Math.floor(100 / n) + '%';
  }
</script>

<svelte:window onclick={closeFilter} onkeydown={handleKeydown} />

<!-- pointerover only adds tooltips to truncated text -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class="virtual-data-table {className}{fixedLayout ? ' vtable-fixed-layout' : ''}{resizing
    ? ' vtable-resizing'
    : ''}"
  style="{style}{fixedTableWidth ? `; --vtable-table-width: ${fixedTableWidth}` : ''}"
  bind:this={scroller}
  onscroll={updateHorizontalScroll}
  onpointerover={revealTruncated}
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
          {#if groupSegments.length > 0}
            <tr class="vtable-group-row" bind:offsetHeight={groupRowHeight}>
              {#each groupSegments as segment}
                {@const stickyKey = groupStickyKey(segment)}
                <th
                  colspan={segment.keys.length}
                  class={groupClass(segment)}
                  style={stickyKey ? stickyStyle(stickyKey) : undefined}
                  scope={segment.group ? 'colgroup' : undefined}
                >
                  {#if segment.group && !segment.cont}
                    <span class="vtable-header-label">{segment.group}</span>
                  {/if}
                </th>
              {/each}
            </tr>
          {/if}
          <tr>
            {#each effectiveVisibleKeys as key, columnIndex}
              {@const colDef = colDefMap[key]}
              {@const filterDef = filterDefMap[key]}
              {@const label = colDef?.label ?? key}
              {@const isSortable = colDef?.sortable !== false}
              {@const selection = filterDef ? filterState.selections[filterDef.key] : undefined}
              {@const isFilterActive = hasActiveFilterValue(selection)}
              <th
                style="width: {calcColWidth(key)}; {stickyStyle(key)}{groupSegments.length > 0
                  ? ` top: ${groupRowHeight}px;`
                  : ''}"
                class="select-none {stickyClass(key)}{filterDef && openFilterKey === filterDef.key
                  ? ' vtable-filter-open'
                  : ''}"
                data-key={key}
                bind:offsetWidth={headerWidths[key]}
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
                      <span class="vtable-header-label min-w-0 truncate">{label}</span>
                      {#if sortKey === key}
                        <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      {/if}
                    </button>
                  {:else}
                    <span class="vtable-header-label min-w-0 flex-1 truncate">{label}</span>
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
                {#if isResizable(key)}
                  <!-- Pointer-only affordance, hidden from assistive technology -->
                  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
                  <span
                    class="vtable-resize-handle{resizing?.key === key
                      ? ' vtable-resize-active'
                      : ''}"
                    aria-hidden="true"
                    title="Drag to resize, double-click to reset all widths"
                    onpointerdown={(e) => startResize(e, key)}
                    onpointermove={moveResize}
                    onpointerup={endResize}
                    onpointercancel={endResize}
                    onlostpointercapture={endResize}
                    onclick={(e) => e.stopPropagation()}
                    ondblclick={(e) => {
                      e.stopPropagation();
                      resetColumnWidths(key);
                    }}
                  ></span>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
      {/snippet}

      {#snippet vl_slot({ index, item })}
        <!-- Default row rendering using each column's cellSnippet or raw value -->
        <tr
          onclick={() => selectItem(item, index)}
          class={selected === item ? 'selected selected-row' : ''}
        >
          {#each columns as col}
            <td
              class={[stickyClass(col.key), cellWraps(col) ? '' : 'vtable-truncate']
                .filter(Boolean)
                .join(' ') || undefined}
              style={stickyStyle(col.key) || undefined}
            >
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
