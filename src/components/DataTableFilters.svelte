<script>
  import { Badge } from 'flowbite-svelte';
  import { CloseOutline, ChevronDownOutline, ArrowDownOutline } from 'flowbite-svelte-icons';

  // shared default no-op function
  const DEFAULT_NOOP = (..._args) => {};

  // Props using Svelte 5 $props()
  let {
    // columnFilters: array of { key, label, uniqueValues }
    // where uniqueValues is an array of unique values for that column
    columnFilters = [],
    // layout direction: 'horizontal' or 'vertical'
    direction = 'horizontal',
    // current active filters: { columnKey: [selectedValues] }
    activeFilters = {},
    // Callback when filters change
    filterChange = DEFAULT_NOOP,
    // Optional callback when sort mode/dir changes: ( { columnKey, mode, dir } )
    sortChange = DEFAULT_NOOP,
    // CSS class for the container
    className = '',
    // Whether to show filter counts
    showCounts = true
  } = $props();

  // Internal state for selected options per column
  let selections = $state({});

  // Initialize selections from activeFilters
  $effect(() => {
    const newSelections = {};
    for (const col of columnFilters) {
      newSelections[col.key] = activeFilters[col.key] || [];
    }
    selections = newSelections;
  });

  // Toggle selection for a specific column and value
  function toggleSelection(columnKey, value) {
    const current = selections[columnKey] || [];
    let updated;

    if (current.includes(value)) {
      // Remove the value
      updated = current.filter(v => v !== value);
    } else {
      // Add the value
      updated = [...current, value];
    }

    selections = { ...selections, [columnKey]: updated };

    // Emit the filter change event
    try {
      (/** @type {any} */ (filterChange))({
        columnKey,
        selectedValues: updated,
        allFilters: selections
      });
    } catch (err) {
      try { console.error('filterChange threw:', err); } catch (e) {}
    }
  }

  // Clear all selections for a column
  function clearColumn(columnKey) {
    selections = { ...selections, [columnKey]: [] };

    try {
      (/** @type {any} */ (filterChange))({
        columnKey,
        selectedValues: [],
        allFilters: selections
      });
    } catch (err) {
      try { console.error('filterChange threw:', err); } catch (e) {}
    }
  }

  // Clear all filters
  function clearAllFilters() {
    const cleared = {};
    for (const col of columnFilters) {
      cleared[col.key] = [];
    }
    selections = cleared;

    try {
      (/** @type {any} */ (filterChange))({
        columnKey: null,
        selectedValues: [],
        allFilters: selections
      });
    } catch (err) {
      try { console.error('filterChange threw:', err); } catch (e) {}
    }
  }

  // Check if any filters are active
  const hasActiveFilters = $derived(() => {
    return Object.values(selections).some(arr => arr && arr.length > 0);
  });

  // Count active filters
  const activeFilterCount = $derived(() => {
    return Object.values(selections).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  });

  // Toggle dropdown visibility for a column
  let openDropdowns = $state({});

  // Simple toggle/close functions — dropdowns are controlled only by their
  // toggle button and programmatic calls (e.g. Show All / Collapse All).
  function toggleDropdown(columnKey) {
    const wasOpen = openDropdowns[columnKey];
    openDropdowns = { ...openDropdowns, [columnKey]: !wasOpen };
  }

  // Sorting state for each column's dropdown
  let sortModes = $state({});
  // Per-column sort direction: 'asc' or 'desc'
  let sortDirs = $state({});

  // Inline header search queries per column (small text filter for options)
  let searchQueries = $state({});

  // Get sorted unique values for a column
  function getSortedValues(column) {
    let values = column.uniqueValues || [];
    const mode = sortModes[column.key] || 'name';
    const dir = (sortDirs[column.key] || 'asc');
    const query = (searchQueries[column.key] || '').toLowerCase();

    if (mode === 'count' && column.counts) {
      // Sort by count
      values = [...values].sort((a, b) => {
        const ca = column.counts[a] || 0;
        const cb = column.counts[b] || 0;
        return dir === 'asc' ? ca - cb : cb - ca;
      });
    } else {
      // Sort by name
      values = [...values].sort((a, b) => {
        const sa = String(a ?? '').localeCompare(String(b ?? ''));
        return dir === 'asc' ? sa : -sa;
      });
    }

    // Filter by search query (apply after sorting to avoid re-sorting)
    if (query) {
      values = values.filter(v => String(v ?? '').toLowerCase().includes(query));
    }

    return values;
  }

  // Toggle sort mode for a column. If the same mode is clicked again,
  // flip the direction; otherwise set the mode and default to 'desc'.
  function toggleSortMode(columnKey, mode) {
    const prevMode = sortModes[columnKey];
    if (prevMode === mode) {
      // flip direction
      const prevDir = sortDirs[columnKey] || 'desc';
      const nextDir = prevDir === 'asc' ? 'desc' : 'asc';
      sortDirs = { ...sortDirs, [columnKey]: nextDir };
    } else {
      sortModes = { ...sortModes, [columnKey]: mode };
      // default first click to descending (common expectation for counts)
      sortDirs = { ...sortDirs, [columnKey]: 'desc' };
    }
    // ensure the mode is set (for first-time clicks)
    sortModes = { ...sortModes, [columnKey]: mode };

    const newDir = sortDirs[columnKey] || 'asc';
    try {
      // notify parent if it wants to react to sort changes
      (/** @type {any} */ (sortChange))({ columnKey, mode, dir: newDir });
    } catch (err) {
      try { console.debug('sortChange callback threw', err); } catch (e) {}
    }
    // debug log
    try { console.debug('toggleSortMode', columnKey, mode, sortDirs[columnKey]); } catch (e) {}
  }

  // Clear selection for a column (from within dropdown)
  function clearSelection(columnKey) {
    clearColumn(columnKey);
  }

  // Show all dropdowns
  function showAllDropdowns() {
    const allOpen = {};
    for (const col of columnFilters) {
      allOpen[col.key] = true;
    }
    openDropdowns = allOpen;
  }

  // Collapse all dropdowns
  function collapseAllDropdowns() {
    openDropdowns = {};
  }

  // Check if all dropdowns are open
  const allDropdownsOpen = $derived.by(() => {
    return columnFilters.every(col => openDropdowns[col.key]);
  });

  // Check if all dropdowns are closed
  const allDropdownsClosed = $derived.by(() => {
    return columnFilters.every(col => !openDropdowns[col.key]);
  });
</script>

<div class="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 {className}"
     class:horizontal={direction === 'horizontal'} class:vertical={direction === 'vertical'}>
  <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0">Filters</h3>
    <div class="flex items-center gap-2 flex-wrap">
      {#if hasActiveFilters()}
        <div class="flex items-center gap-2">
          <Badge color="blue" rounded>{activeFilterCount()} active</Badge>
          <button
            class="px-3 py-1 text-sm text-red-600 bg-transparent border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all cursor-pointer"
            onclick={clearAllFilters}
            title="Clear all filters"
          >
            Clear All
          </button>
        </div>
      {/if}
      <button
        class="px-3 py-1 text-sm text-green-600 bg-transparent border border-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-green-600"
        disabled={allDropdownsOpen}
        onclick={showAllDropdowns}
        title="Show all filter dropdowns"
      >
        Show All
      </button>
      <button
        class="px-3 py-1 text-sm text-gray-600 bg-transparent border border-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
        disabled={allDropdownsClosed}
        onclick={collapseAllDropdowns}
        title="Collapse all filter dropdowns"
      >
        Collapse All
      </button>
    </div>
  </div>

  <div class="grid gap-3" class:grid-horizontal={direction === 'horizontal'} class:grid-vertical={direction === 'vertical'}>
    {#each columnFilters as column (column.key)}
      {@const isActive = selections[column.key]?.length > 0}
      {@const isOpen = openDropdowns[column.key]}
      {@const sortedValues = getSortedValues(column)}
      {@const currentSortMode = sortModes[column.key] || 'name'}
      {@const currentSortDir = sortDirs[column.key] || 'asc'}

      <div class="flex flex-col min-w-0 relative">
        <button
          id="filter-{column.key}"
          class="w-full flex justify-between items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all cursor-pointer gap-2 {isActive ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' : ''}"
          onclick={() => toggleDropdown(column.key)}
          type="button"
        >
          <span class="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
              {column.label || column.key}
          </span>
          {#if isActive}
            <Badge color="green" rounded class="ml-1">{selections[column.key].length}</Badge>
          {/if}
          <ChevronDownOutline class="w-5 h-5 shrink-0 transition-transform {isOpen ? 'rotate-180' : ''}" />
        </button>

        {#if isOpen}
          <div
            class="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900 max-h-64 flex flex-col dropdown-menu"
            tabindex="-1"
            data-column={column.key}
          >
            <div class="px-1 py-1 border-b border-gray-200 dark:border-gray-600">
              <div class="flex items-center gap-1 w-full min-w-0">
                <input
                  type="text"
                  placeholder="Filter..."
                  class="p-1 flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                  bind:value={searchQueries[column.key]}
                />

                <div class="flex items-center gap-1">
                  <button
                    class="p-0.5 flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                    class:bg-blue-100={currentSortMode === 'name'}
                    class:dark:bg-blue-900={currentSortMode === 'name'}
                    onclick={() => toggleSortMode(column.key, 'name')}
                    title="Sort by name"
                    type="button"
                  >
                    <span class="text-sm font-semibold">Aa</span>
                    <ArrowDownOutline
                      class={"w-3 h-3 transition-transform " + (currentSortMode === 'name' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-400 dark:text-gray-500')}
                      style={currentSortMode === 'name' && currentSortDir === 'asc' ? 'transform: rotate(180deg);' : ''}
                      aria-hidden="true"
                    />
                  </button>

                  {#if showCounts && column.counts}
                    <button
                      class="p-0.5 flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                      class:bg-blue-100={currentSortMode === 'count'}
                      class:dark:bg-blue-900={currentSortMode === 'count'}
                      onclick={() => toggleSortMode(column.key, 'count')}
                      title="Sort by count"
                      type="button"
                    >
                      <span class="text-sm font-semibold">#</span>
                      <ArrowDownOutline
                        class={"w-3 h-3 transition-transform " + (currentSortMode === 'count' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-400 dark:text-gray-500')}
                        style={currentSortMode === 'count' && currentSortDir === 'asc' ? 'transform: rotate(180deg);' : ''}
                        aria-hidden="true"
                      />
                    </button>
                  {/if}
                </div>

                <button
                  class="p-1 flex items-center justify-center text-xs bg-transparent border rounded transition-all text-red-600 border-red-100 hover:bg-red-50 hover:border-red-600 ml-auto"
                  class:opacity-50={!isActive}
                  class:cursor-not-allowed={!isActive}
                  disabled={!isActive}
                  onclick={() => clearSelection(column.key)}
                  title="Clear selection"
                  type="button"
                >
                  <CloseOutline class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="p-2 overflow-y-auto flex-1">
              {#if sortedValues.length > 0}
                {#each sortedValues as value, idx (idx)}
                  {@const isSelected = selections[column.key]?.includes(value)}
                  {@const displayValue = value === null || value === undefined ? '(empty)' : String(value)}

                  <label class="flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onchange={() => toggleSelection(column.key, value)}
                      class="w-4 h-4 shrink-0 cursor-pointer accent-blue-500"
                    />
                    <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 select-none min-w-0 overflow-hidden text-ellipsis">{displayValue}</span>
                    {#if showCounts && column.counts && column.counts[value] !== undefined}
                      <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto shrink-0">({column.counts[value]})</span>
                    {/if}
                  </label>
                {/each}
              {:else}
                <div class="p-4 text-center text-sm text-gray-400 dark:text-gray-500">No values available</div>
              {/if}
            </div>
          </div>
        {/if}
        </div>
      {/each}
  </div>
</div>

<style>
  /* Grid layout classes */
  .grid-horizontal {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .grid-vertical {
    grid-template-columns: 1fr;
  }

  /* Dropdown menu positioning */
  .dropdown-menu {
    z-index: 9999;
  }

  /* Responsive adjustments */
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
