<script>
  import { Badge } from 'flowbite-svelte';
  import { CloseOutline, ChevronDownOutline, SortOutline, ChartMixedOutline } from 'flowbite-svelte-icons';

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

  function toggleDropdown(columnKey) {
    const wasOpen = openDropdowns[columnKey];
    openDropdowns = { ...openDropdowns, [columnKey]: !wasOpen };
    if (!wasOpen) {
      inputModes = { ...inputModes, [columnKey]: true };
      // Focus the input after render
      setTimeout(() => {
        const input = searchInputs[columnKey];
        if (input) input.focus();
      }, 0);
    } else {
      inputModes = { ...inputModes, [columnKey]: false };
    }
  }

  function closeDropdown(columnKey) {
    openDropdowns = { ...openDropdowns, [columnKey]: false };
    inputModes = { ...inputModes, [columnKey]: false };
  }

  // Handle click outside to close dropdowns
  function handleClickOutside(event, columnKey) {
    const dropdown = event.currentTarget;
    if (!dropdown.contains(event.relatedTarget)) {
      closeDropdown(columnKey);
    }
  }

  // Sorting state for each column's dropdown
  let sortModes = $state({});
  let searchQueries = $state({});
  let searchInputs = $state({}); // refs for search inputs
  let inputModes = $state({}); // whether each select is in input mode

  // Get sorted unique values for a column
  function getSortedValues(column, search = '') {
    let values = column.uniqueValues || [];
    if (search) {
      const q = search.toLowerCase();
      values = values.filter(v => String(v ?? '').toLowerCase().includes(q));
    }
    const mode = sortModes[column.key] || 'name';

    if (mode === 'count' && column.counts) {
      // Sort by count (descending)
      return [...values].sort((a, b) => (column.counts[b] || 0) - (column.counts[a] || 0));
    } else {
      // Sort by name (ascending)
      return [...values].sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')));
    }
  }

  // Toggle sort mode for a column
  function toggleSortMode(columnKey, mode) {
    sortModes = { ...sortModes, [columnKey]: mode };
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

  // Handle input blur to exit input mode
  function handleInputBlur(columnKey) {
    inputModes = { ...inputModes, [columnKey]: false };
    closeDropdown(columnKey);
  }
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
      {@const sortedValues = getSortedValues(column, searchQueries[column.key])}
      {@const currentSortMode = sortModes[column.key] || 'name'}

      <div class="flex flex-col min-w-0 relative">
        {#if isOpen && inputModes[column.key]}
          <input
            bind:value={searchQueries[column.key]}
            class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 {isActive ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' : ''}"
            placeholder={column.label || column.key}
            bind:this={searchInputs[column.key]}
            onblur={() => handleInputBlur(column.key)}
          />
        {:else}
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
        {/if}

        {#if isOpen}
          <div
            class="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900 max-h-64 flex flex-col dropdown-menu"
            tabindex="-1"
            onblur={(e) => handleClickOutside(e, column.key)}
          >
              <div class="flex justify-between items-center px-2 py-2 border-b border-gray-200 dark:border-gray-600 gap-2 flex-wrap">
                <div class="flex gap-1">
                  <button
                    class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all cursor-pointer whitespace-nowrap"
                    class:bg-blue-100={currentSortMode === 'name'}
                    class:dark:bg-blue-900={currentSortMode === 'name'}
                    class:border-blue-500={currentSortMode === 'name'}
                    class:dark:border-blue-600={currentSortMode === 'name'}
                    class:text-blue-900={currentSortMode === 'name'}
                    class:dark:text-blue-100={currentSortMode === 'name'}
                    onclick={() => toggleSortMode(column.key, 'name')}
                    title="Sort by name"
                    type="button"
                  >
                    <SortOutline class="w-3.5 h-3.5" />
                    Name
                  </button>
                  {#if showCounts && column.counts}
                    <button
                      class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all cursor-pointer whitespace-nowrap"
                      class:bg-blue-100={currentSortMode === 'count'}
                      class:dark:bg-blue-900={currentSortMode === 'count'}
                      class:border-blue-500={currentSortMode === 'count'}
                      class:dark:border-blue-600={currentSortMode === 'count'}
                      class:text-blue-900={currentSortMode === 'count'}
                      class:dark:text-blue-100={currentSortMode === 'count'}
                      onclick={() => toggleSortMode(column.key, 'count')}
                      title="Sort by count"
                      type="button"
                    >
                      <ChartMixedOutline class="w-3.5 h-3.5" />
                      Count
                    </button>
                  {/if}
                </div>
                {#if isActive}
                  <button
                    class="flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-transparent border border-red-100 rounded hover:bg-red-50 hover:border-red-600 transition-all cursor-pointer whitespace-nowrap"
                    onclick={() => clearSelection(column.key)}
                    title="Clear selection"
                    type="button"
                  >
                    <CloseOutline class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </div>
              <div class="p-2 overflow-y-auto flex-1">
                {#if sortedValues.length > 0}
                  {#each sortedValues as value, idx (idx)}
                    {@const isSelected = selections[column.key]?.includes(value)}
                    {@const displayValue = value === null || value === undefined ? '(empty)' : String(value)}

                    <label class="flex items-center gap-2 px-2 py-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
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
