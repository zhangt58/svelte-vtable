<script>
  import { VirtualList } from 'svelte-virtuallists';

  // Runic props: accept props via $props() so the component matches the
  // project's runes-style components. Include the `select` callback prop.
  let {
    items = [],
    // New unified column definitions. When provided, visibleKeys and colWidths
    // are derived from this array and do not need to be passed separately.
    // @type {import('../lib/index.js').ColumnDef[]}
    columns = undefined,
    // Legacy props — still supported for backward compatibility.
    // When `columns` is provided these are ignored unless they are also explicitly set.
    visibleKeys = [],
    // sortKey/sortDir are bindable so parents can observe or control sort state.
    sortKey = $bindable(null),
    sortDir = $bindable('asc'),
    className = '',
    style = '',
    emptyMessage = 'No items to display.',
    colWidths = {},
    selected = null,
    // onselect({ item, index }) — called when a row is selected
    onselect = undefined,
    // onsort({ key, dir }) is called whenever sort changes.
    // When provided, no local sorting is applied (server-side sort pattern).
    onsort = undefined,
    // New prop: allow consumers to disable virtualization (useful when paginating by fixed item counts)
    // If `virtualize` is false we ask the wrapped VirtualList to render as a normal list/table
    // by setting its `isDisabled` prop. Default: true (virtualization enabled).
    virtualize = true,
    // <slot> -> @render migration. Optional when `columns` with cellSnippets is provided.
    rowSnippet = undefined,
  } = $props();

  // --- Derived values from ColumnDef[] or legacy props ---

  // Keys of columns to display.
  const effectiveVisibleKeys = $derived(columns ? columns.map((c) => c.key) : visibleKeys);

  // Width configuration: build an object keyed by column key.
  // When `columns` is provided, use the `width` field (default 1).
  // Otherwise fall back to the legacy `colWidths` prop.
  const effectiveColWidths = $derived(
    columns
      ? Object.fromEntries(columns.map((c) => [c.key, c.width ?? 1]))
      : colWidths,
  );

  // Fast lookup map: key → ColumnDef (only populated when `columns` is provided).
  const colDefMap = $derived(
    columns ? Object.fromEntries(columns.map((c) => [c.key, c])) : {},
  );

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

  // Normalize colWidths: handle object or array input, treat numeric as stretch weights.
  // NOTE: percentage strings (e.g. '30%') are no longer supported and will be ignored with a warning.
  function normalizeColWidths() {
    const map = {};
    const keys = effectiveVisibleKeys;
    const widths = effectiveColWidths;

    // Build an ordered list of entries for effectiveVisibleKeys
    const entries = keys.map((key, i) => {
      let v;
      if (Array.isArray(widths)) v = widths[i];
      else if (widths && typeof widths === 'object') v = widths[key];
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
      const widths = effectiveColWidths;
      if (Array.isArray(widths) && widths[index] !== undefined) {
        const v = widths[index];
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s.endsWith('%')) {
            return v; // e.g. '120px'
          }
          // percent strings are ignored silently
        }
      }
      if (typeof widths === 'object' && widths[key] !== undefined) {
        const v = widths[key];
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
    const n = Math.max(1, effectiveVisibleKeys.length);
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
          {#each effectiveVisibleKeys as key, i}
            <col style="width: {calcColWidth(key, i)}" />
          {/each}
        </colgroup>
        <thead class="sticky-header">
          <tr>
            {#each effectiveVisibleKeys as key, i}
              {@const colDef = colDefMap[key]}
              {@const label = colDef?.label ?? key}
              {@const isSortable = colDef?.sortable !== false}
              <th
                style="width: {calcColWidth(key, i)}"
                class={isSortable ? 'cursor-pointer select-none' : 'select-none'}
                onclick={isSortable ? () => handleSort(key) : undefined}
                aria-sort={sortKey === key
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'}
              >
                {#if colDef?.headerSnippet}
                  {@render colDef.headerSnippet({ key, label, sortKey, sortDir })}
                {:else}
                  <div class="inline-flex items-center gap-1">
                    <span>{label}</span>
                    {#if sortKey === key}
                      <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    {/if}
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
      {/snippet}

      {#snippet vl_slot({ index, item })}
        {#if rowSnippet}
          {@render rowSnippet({ item, index, select: () => selectItem(item, index), selected })}
        {:else if columns}
          <!-- Default row rendering when columns is provided but rowSnippet is not -->
          <tr>
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
        {/if}
      {/snippet}
    </VirtualList>
  {:else}
    <div class="p-4 text-center text-slate-500">{emptyMessage}</div>
  {/if}
</section>

<style>
  @import '../lib/dist/styles.css';
</style>
