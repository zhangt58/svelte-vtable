<script>
  import { Badge } from 'flowbite-svelte';

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
    openDropdowns = { ...openDropdowns, [columnKey]: !openDropdowns[columnKey] };
  }

  function closeDropdown(columnKey) {
    openDropdowns = { ...openDropdowns, [columnKey]: false };
  }

  // Handle click outside to close dropdowns
  function handleClickOutside(event, columnKey) {
    const dropdown = event.currentTarget;
    if (!dropdown.contains(event.relatedTarget)) {
      closeDropdown(columnKey);
    }
  }
</script>

<div class="data-table-filters {className}" class:horizontal={direction === 'horizontal'} class:vertical={direction === 'vertical'}>
  <div class="filters-header">
    <h3 class="filters-title">Filters</h3>
    {#if hasActiveFilters()}
      <div class="filters-summary">
        <Badge color="blue" rounded>{activeFilterCount()} active</Badge>
        <button
          class="clear-all-btn"
          onclick={clearAllFilters}
          title="Clear all filters"
        >
          Clear All
        </button>
      </div>
    {/if}
  </div>

  <div class="filters-grid" class:grid-horizontal={direction === 'horizontal'} class:grid-vertical={direction === 'vertical'}>
    {#each columnFilters as column (column.key)}
      {@const isActive = selections[column.key]?.length > 0}
      {@const isOpen = openDropdowns[column.key]}

      <div class="filter-column">
        <div class="filter-label-row">
          <label class="filter-label" for="filter-{column.key}">
            {column.label || column.key}
            {#if isActive}
              <Badge color="green" rounded class="ml-1">{selections[column.key].length}</Badge>
            {/if}
          </label>
          {#if isActive}
            <button
              class="clear-column-btn"
              onclick={() => clearColumn(column.key)}
              title="Clear {column.label || column.key} filter"
            >
              ✕
            </button>
          {/if}
        </div>

        <div class="filter-dropdown-wrapper" tabindex="-1" onblur={(e) => handleClickOutside(e, column.key)}>
          <button
            id="filter-{column.key}"
            class="filter-dropdown-toggle"
            class:active={isActive}
            onclick={() => toggleDropdown(column.key)}
            type="button"
          >
            <span class="dropdown-text">
              {#if isActive}
                {selections[column.key].length} selected
              {:else}
                Select values...
              {/if}
            </span>
            <svg class="dropdown-icon" class:rotate={isOpen} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {#if isOpen}
            <div class="filter-dropdown-menu">
              <div class="dropdown-menu-inner">
                {#if column.uniqueValues && column.uniqueValues.length > 0}
                  {#each column.uniqueValues as value, idx (idx)}
                    {@const isSelected = selections[column.key]?.includes(value)}
                    {@const displayValue = value === null || value === undefined ? '(empty)' : String(value)}

                    <label class="dropdown-item">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onchange={() => toggleSelection(column.key, value)}
                        class="filter-checkbox"
                      />
                      <span class="checkbox-label">{displayValue}</span>
                      {#if showCounts && column.counts && column.counts[value] !== undefined}
                        <span class="value-count">({column.counts[value]})</span>
                      {/if}
                    </label>
                  {/each}
                {:else}
                  <div class="dropdown-empty">No values available</div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .data-table-filters {
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .filters-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .filters-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .clear-all-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    color: #dc2626;
    background-color: transparent;
    border: 1px solid #dc2626;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-all-btn:hover {
    background-color: #dc2626;
    color: white;
  }

  .filters-grid {
    display: grid;
    gap: 1rem;
  }

  .grid-horizontal {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .grid-vertical {
    grid-template-columns: 1fr;
  }

  .filter-column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    display: flex;
    align-items: center;
    margin: 0;
  }

  .clear-column-btn {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    color: #6b7280;
    background-color: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-column-btn:hover {
    color: #dc2626;
    background-color: #fee2e2;
  }

  .filter-dropdown-wrapper {
    position: relative;
  }

  .filter-dropdown-toggle {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-dropdown-toggle:hover {
    border-color: #9ca3af;
  }

  .filter-dropdown-toggle:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .filter-dropdown-toggle.active {
    border-color: #10b981;
    background-color: #f0fdf4;
  }

  .dropdown-text {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-left: 0.5rem;
    transition: transform 0.2s;
  }

  .dropdown-icon.rotate {
    transform: rotate(180deg);
  }

  .filter-dropdown-menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    z-index: 50;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    max-height: 300px;
    overflow-y: auto;
  }

  .dropdown-menu-inner {
    padding: 0.5rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s;
  }

  .dropdown-item:hover {
    background-color: #f3f4f6;
  }

  .filter-checkbox {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .checkbox-label {
    flex: 1;
    font-size: 0.875rem;
    color: #374151;
    user-select: none;
  }

  .value-count {
    font-size: 0.75rem;
    color: #6b7280;
    margin-left: auto;
  }

  .dropdown-empty {
    padding: 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: #9ca3af;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .grid-horizontal {
      grid-template-columns: 1fr;
    }
  }

  /* Dark mode support (optional) */
  @media (prefers-color-scheme: dark) {
    .data-table-filters {
      background-color: #1f2937;
      border-color: #374151;
    }

    .filters-title {
      color: #f9fafb;
    }

    .filter-label {
      color: #d1d5db;
    }

    .filter-dropdown-toggle {
      background-color: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    .filter-dropdown-toggle.active {
      border-color: #10b981;
      background-color: #064e3b;
    }

    .filter-dropdown-menu {
      background-color: #374151;
      border-color: #4b5563;
    }

    .dropdown-item:hover {
      background-color: #4b5563;
    }

    .checkbox-label {
      color: #d1d5db;
    }

    .clear-column-btn:hover {
      background-color: #7f1d1d;
    }
  }
</style>

