<script>
  import { VirtualList } from 'svelte-virtuallists';

  // shared default no-op function (accepts any args) so prop types allow being called with a payload
  const DEFAULT_NOOP = (..._args) => {};

  // Runic props: accept props via $props() so the component matches the
  // project's runes-style components. Include the `select` callback prop.
  let {
    items = [],
    visibleKeys = [],
    // sortKey/sortDir are bindable so parents can observe or control sort state.
    sortKey = $bindable(null),
    sortDir = $bindable('asc'),
    className = '',
    style = '',
    emptyMessage = 'No items to display.',
    colWidths = {},
    selected = null,
    // external selection callback with a safe default no-op
    selectCallback = DEFAULT_NOOP,
    // onsort({ key, dir }) is called whenever sort changes.
    // When provided, no local sorting is applied (server-side sort pattern).
    onsort = undefined,
    // New prop: allow consumers to disable virtualization (useful when paginating by fixed item counts)
    // If `virtualize` is false we ask the wrapped VirtualList to render as a normal list/table
    // by setting its `isDisabled` prop. Default: true (virtualization enabled).
    virtualize = true,
    // <slot> -> @render migration
    rowSnippet,
  } = $props();

  // Internal sorted array derived from items + current sort state.
  // When onsort is provided the parent manages sorting (server-side), so we
  // pass items through unchanged. Otherwise we sort locally.
  const sortedItems = $derived.by(() => {
    if (onsort !== undefined || !sortKey) return items;

    const key = sortKey;
    const dir = sortDir;
    return [...items].sort((a, b) => {
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
      callSelectCallback({ item, index });
    } catch (err) {
      try {
        console.error('selectCallback threw:', err);
      } catch (e) {}
    }
  }

  // Wrapper that casts the possibly-typed callback to any before invoking so callers may pass a payload
  function callSelectCallback(payload) {
    try {
      /** @type {any} */ (selectCallback)(payload);
    } catch (err) {
      try {
        console.error('selectCallback threw:', err);
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
        const pct =
          idx === numeric.length - 1
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

<section class="virtual-data-table {className}" {style}>
  {#if items && items.length > 0}
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
          {#each visibleKeys as key, i}
            <col style="width: {calcColWidth(key, i)}" />
          {/each}
        </colgroup>
        <thead class="sticky-header">
          <tr>
            {#each visibleKeys as key, i}
              <th
                style="width: {calcColWidth(key, i)}"
                class="cursor-pointer select-none"
                onclick={() => handleSort(key)}
                aria-sort={sortKey === key
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'}
              >
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
        {@render rowSnippet({ item, index, select: () => selectItem(item, index), selected })}
      {/snippet}
    </VirtualList>
  {:else}
    <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
  {/if}
</section>

<style>
  @import '../lib/dist/styles.css';
</style>
