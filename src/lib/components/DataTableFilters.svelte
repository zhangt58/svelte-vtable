<script>
  import { useFilterState } from './filters/useFilterState.svelte.js';
  import FilterColumn from './filters/FilterColumn.svelte';
  import FilterValueList from './filters/FilterValueList.svelte';
  import FilterDateRange from './filters/FilterDateRange.svelte';

  let {
    columnFilters = [],
    direction = 'horizontal',
    activeFilters = {},
    onfilter = undefined,
    oncolumnsort = undefined,
    className = '',
    showCounts = true,
    virtualThreshold = 500,
    virtualItemHeight = 36,
    virtualOverscan = 5,
    emitDebounce = 100,
    populateThreshold = 200,
    dropdownInline = true,
    relativeRangePresets = [
      { label: '1h', value: 1, unit: 'hour' },
      { label: '6h', value: 6, unit: 'hour' },
      { label: '12h', value: 12, unit: 'hour' },
      { label: '1d', value: 1, unit: 'day' },
      { label: '7d', value: 7, unit: 'day' },
      { label: '30d', value: 30, unit: 'day' },
      { label: '1y', value: 1, unit: 'year' },
    ],
  } = $props();

  const fs = useFilterState({
    columnFilters: () => columnFilters,
    activeFilters: () => activeFilters,
    emitDebounce: () => emitDebounce,
    onfilter: () => onfilter,
  });

  let openDropdowns = $state({});
  const toggle = (key) => (openDropdowns = { ...openDropdowns, [key]: !openDropdowns[key] });
  const showAll = () => {
    const a = {};
    for (const c of columnFilters) a[c.key] = true;
    openDropdowns = a;
  };
  const closeAll = () => (openDropdowns = {});

  const allOpen = $derived(columnFilters.every((c) => openDropdowns[c.key]));
  const allClosed = $derived(columnFilters.every((c) => !openDropdowns[c.key]));
  const isDateRange = (col) => col.type === 'daterange' || col.type === 'datetimerange';

  const hasActive = $derived(
    Object.values(fs.selections).some((v) =>
      Array.isArray(v) ? v.length > 0 : !!(v?.from || v?.to),
    ),
  );
  const activeCount = $derived(
    Object.values(fs.selections).reduce((s, v) => {
      if (Array.isArray(v)) return s + (v?.length || 0);
      if (v && typeof v === 'object' && (v.from || v.to)) return s + 1;
      return s;
    }, 0),
  );

  function handleSortChange(columnKey, { mode, dir }) {
    try {
      if (oncolumnsort) /** @type {any} */ (oncolumnsort)({ key: columnKey, mode, dir });
    } catch (err) {
      try {
        console.debug('oncolumnsort threw', err);
      } catch (e) {}
    }
  }
</script>

<div
  class="p-2 bg-gray-50 rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700 {className}"
  class:horizontal={direction === 'horizontal'}
  class:vertical={direction === 'vertical'}
>
  <div class="flex justify-between items-center mb-2 flex-wrap gap-1">
    <div class="flex items-center gap-1 flex-wrap">
      <button
        class="px-3 py-1 text-sm bg-transparent border rounded-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style="color: var(--vtable-color-accent); border-color: var(--vtable-color-accent);"
        disabled={allOpen}
        onclick={showAll}
        onmouseenter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = 'var(--vtable-color-accent)';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onmouseleave={(e) => {
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.color = 'var(--vtable-color-accent)';
        }}
        title="Show all filter dropdowns">Show All</button
      >
      <button
        class="px-3 py-1 text-sm text-gray-600 bg-transparent border border-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
        disabled={allClosed}
        onclick={closeAll}
        title="Close all filter dropdowns">Close All</button
      >
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      {#if hasActive}
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
          >{activeCount} active</span
        >
        <button
          class="px-3 py-1 text-sm text-red-600 bg-transparent border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all cursor-pointer"
          onclick={fs.clearAllFilters}
          title="Clear all filters">Clear All</button
        >
      {/if}
    </div>
  </div>

  <div
    class="grid gap-2"
    class:grid-horizontal={direction === 'horizontal'}
    class:grid-vertical={direction === 'vertical'}
  >
    {#each columnFilters as column (column.key)}
      {@const sel = fs.selections[column.key]}
      {@const isActive = Array.isArray(sel) ? sel.length > 0 : !!(sel?.from || sel?.to)}
      {@const isOpen = !!openDropdowns[column.key]}
      <div class="flex flex-col min-w-0 relative">
        <FilterColumn
          {column}
          {isOpen}
          {isActive}
          selection={sel}
          ontoggle={() => toggle(column.key)}
        />
        {#if isOpen}
          <div
            class={[
              dropdownInline ? '' : 'absolute top-full left-0 right-0',
              'mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900 flex flex-col dropdown-menu',
              isDateRange(column) ? 'overflow-y-auto' : 'max-h-64',
            ]
              .filter(Boolean)
              .join(' ')}
            tabindex="-1"
            data-column={column.key}
          >
            {#if isDateRange(column)}
              <FilterDateRange
                {column}
                selection={sel || {}}
                {relativeRangePresets}
                onchange={(u) => fs.updateDateRange(column.key, u)}
                onclear={() => fs.clearColumn(column.key)}
              />
            {:else}
              <FilterValueList
                {column}
                selections={sel || []}
                {showCounts}
                {virtualThreshold}
                {virtualItemHeight}
                {virtualOverscan}
                {populateThreshold}
                ontoggle={(v) => fs.toggleSelection(column.key, v)}
                oncheckall={(vs) => fs.checkAll(column.key, vs)}
                oninvert={(vs) => fs.invertSelection(column.key, vs)}
                onchecknone={() => fs.checkNone(column.key)}
                onsortchange={(i) => handleSortChange(column.key, i)}
              />
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .grid-horizontal {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .grid-vertical {
    grid-template-columns: 1fr;
  }
  .dropdown-menu {
    z-index: 9999;
  }
  @media (max-width: 768px) {
    .grid-horizontal {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
  }
  @media (max-width: 640px) {
    .grid-horizontal {
      grid-template-columns: 1fr;
    }
  }
</style>
