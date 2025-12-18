<script>
  import { VirtualList } from 'svelte-virtuallists';

  // shared default no-op function (accepts any args) so prop types allow being called with a payload
  const DEFAULT_NOOP = (..._args) => {};

  // Default sort behavior: sort by the header string alphabetically, toggling asc/desc
  function defaultSort(key) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }

  // Runic props: accept props via $props() so the component matches the
  // project's runes-style components. Include the `select` callback prop.
  let {
    items = [],
    visibleKeys = [],
    // treat sortKey/sortDir as normal props; parent may control them and
    // provide a `sort` callback to update them.
    sortKey = null,
    sortDir = 'asc',
    className = '',
    style = '',
    emptyMessage = 'No items to display.',
    colWidths = {},
    selected = null,
    // external selection callback with a safe default no-op
    selectCallback = DEFAULT_NOOP,
    // new prop name: sortCallback defaulting to `defaultSort` (alphabetical string sort)
    sortCallback = defaultSort,
    // New prop: allow consumers to disable virtualization (useful when paginating by fixed item counts)
    // If `virtualize` is false we ask the wrapped VirtualList to render as a normal list/table
    // by setting its `isDisabled` prop. Default: true (virtualization enabled).
    virtualize = true,
    // <slot> -> @render migration
    rowSnippet
  } = $props();

  // expose selection via the callback prop (if provided)
  function selectItem(item, index) {
    selected = item;
    try { callSelectCallback({ item, index }); } catch (err) { try { console.error('selectCallback threw:', err); } catch (e) {} }
  }

  // Wrapper that casts the possibly-typed callback to any before invoking so callers may pass a payload
  function callSelectCallback(payload) {
    try {
      (/** @type {any} */ (selectCallback))(payload);
    } catch (err) {
      try { console.error('selectCallback threw:', err); } catch (e) {}
    }
  }

  // When header is clicked update the exported sortKey/sortDir so parents
  // using bind:sortKey / bind:sortDir receive updates (no event dispatching).
  function handleSort(key) {
    // Delegate sorting to the configured callback (by default `defaultSort` will run)
    try { sortCallback(key); } catch (err) { try { console.error('sortCallback threw:', err); } catch (e) {} }
  }

  // Normalize colWidths: handle object or array input, treat numeric as stretch weights.
  // NOTE: percentage strings (e.g. '30%') are no longer supported and will be ignored with a warning.
  function normalizeColWidths() {
    const map = {};

    // Build an ordered list of entries for visibleKeys
    const entries = visibleKeys.map((key, i) => {
      let v;
      if (Array.isArray(colWidths)) v = colWidths[i];
      else if (colWidths && typeof colWidths === 'object') v = colWidths[key];
      else v = undefined;
      return { key, v };
    });

    // Collect numeric stretch weights and pass-through non-percent strings
    const numeric = [];
    const otherStrings = [];

    for (const e of entries) {
      const v = e.v;
      if (typeof v === 'number' && !Number.isNaN(v)) {
        numeric.push({ key: e.key, w: v });
      } else if (typeof v === 'string') {
        const s = v.trim();
        if (s.endsWith('%')) {
          // Percent strings are intentionally unsupported now - ignore silently
        } else {
          // keep other string units (e.g., '120px')
          otherStrings.push({ key: e.key, v: s });
        }
      }
    }

    const totalWeight = numeric.reduce((s, r) => s + r.w, 0);
    const availablePct = 100;

    if (numeric.length > 0 && totalWeight > 0) {
      let acc = 0;
      numeric.forEach((n, idx) => {
        const pct = idx === numeric.length - 1
          ? Math.max(0, Math.round((availablePct - acc) * 100) / 100)
          : Math.round((n.w / totalWeight) * availablePct * 100) / 100;
        map[n.key] = `${pct}%`;
        acc += pct;
      });
    }

    // Copy through non-percent strings (e.g. '120px')
    for (const o of otherStrings) {
      map[o.key] = o.v;
    }

    return map;
  }

  // Compute column width by key (fallback to even distribution)
  function calcColWidth(key, index) {
    try {
      const norm = normalizeColWidths();
      if (norm && norm[key] !== undefined) return String(norm[key]);

      // Fallbacks: accept string widths (e.g. '120px') passed directly by the user.
      // Numeric values should be provided as stretch weights and will be handled
      // by normalizeColWidths(); if we encounter numeric values here, warn and ignore them.
      if (Array.isArray(colWidths) && colWidths[index] !== undefined) {
        const v = colWidths[index];
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s.endsWith('%')) {
            return v; // e.g. '120px'
          }
          // percent strings are ignored silently
        }
      }
      if (typeof colWidths === 'object' && colWidths[key] !== undefined) {
        const v = colWidths[key];
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s.endsWith('%')) {
            return v; // e.g. '120px'
          }
          // percent strings are ignored silently
        }
      }
    } catch (err) {
      // ignore and fall through to defaults
    }
    const n = Math.max(1, visibleKeys.length);
    const pct = Math.floor(100 / n);
    return pct + '%';
  }

</script>

<section class="virtual-data-table {className}" style={style}>
  {#if items && items.length > 0}
    <!-- When `virtualize` is false we instruct VirtualList to render as a normal list/table
         by setting `isDisabled`. This ensures pagination based on item counts shows the
         exact number of rows expected (useful when rows have variable height). -->
    <VirtualList items={items} isTable isDisabled={!virtualize} class="datatable-table max-w-full max-h-full overflow-auto">
        <!-- colgroup enforces the column widths so table-layout: fixed distributes as intended -->
      {#snippet header()}
        <colgroup>
          {#each visibleKeys as key, i}
            <col style="width: {calcColWidth(key, i)}" />
          {/each}
        </colgroup>
        <thead class="sticky-header">
          <tr>
            {#each visibleKeys as key, i}
              <th style="width: {calcColWidth(key, i)}" class="cursor-pointer select-none" onclick={() => handleSort(key)}
                  aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <div class="inline-flex items-center gap-1">
                  <span>{key}</span>
                  {#if sortKey === key}
                    <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
      {/snippet}

      {#snippet vl_slot({ index, item })}
        {@render rowSnippet({item, index, select: () => selectItem(item, index), selected})}
      {/snippet}
    </VirtualList>
  {:else}
    <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
  {/if}
</section>

<style>
  @import '../lib/dist/styles.css';
</style>

