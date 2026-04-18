<script>
  import { Search, Badge, Select } from 'flowbite-svelte';
  import { FilterOutline } from 'flowbite-svelte-icons';
  import FiltersModal from './FiltersModal.svelte';
  import PaginationBar from './PaginationBar.svelte';

  // Props for search, pagination (perPage made bindable using Svelte 5 rune $bindable)
  let {
    search = '',
    currentPage = 1,
    perPage = $bindable(25),
    totalItems = 0,
    onpage = undefined,
    onsearch = undefined,
    // control visibility of DataTableFilters above the controls
    filtersVisible = false,
    // callback when toggle changes: onfilterstoggle({ visible })
    onfilterstoggle = undefined,
    // optional DataTableFilters inputs - when provided, this component will render the filters
    columnFilters = [],
    activeFilters = {},
    // onfilter({ key, values, allFilters }) — passed through to DataTableFilters
    /** @type {((..._args: any[]) => void) | undefined} */
    onfilter = undefined,
    direction = 'horizontal',
    showCounts = true,
    className = '',
    // callback when perPage changes: onperpage({ perPage })
    onperpage = undefined,
  } = $props();

  const perPageOptions = [
    { value: 10, name: '10 rows' },
    { value: 25, name: '25 rows' },
    { value: 50, name: '50 rows' },
    { value: 100, name: '100 rows' },
  ];

  // count of active filters (sum of selected values per column)
  const activeFilterCount = $derived.by(() => {
    try {
      return Object.values(activeFilters || {}).reduce(
        (sum, v) => sum + (Array.isArray(v) ? v.length : 0),
        0,
      );
    } catch (e) {
      return 0;
    }
  });

  // totalPages derived from totalItems and perPage
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / perPage)));

  // clamp currentPage into valid range whenever currentPage or totalPages change
  $effect(() => {
    currentPage = Math.min(Math.max(1, +currentPage || 1), totalPages);
  });

  function goTo(p) {
    const np = Math.min(Math.max(1, Math.floor(p)), totalPages);
    if (np !== currentPage) {
      currentPage = np;
      if (onpage !== undefined) {
        onpage({ page: np });
      }
    }
  }

  // emit search changes for parent when search updates
  $effect(() => {
    if (typeof search !== 'undefined') {
      if (onsearch !== undefined) {
        onsearch({ search });
      }
    }
  });

  // call onfilterstoggle when filtersVisible changes (avoid on:change typing issues)
  let _prevFiltersVisible = undefined;
  $effect(() => {
    // initialize previous value on first run without emitting
    if (_prevFiltersVisible === undefined) {
      _prevFiltersVisible = filtersVisible;
      return;
    }
    if (filtersVisible !== _prevFiltersVisible) {
      if (onfilterstoggle !== undefined) {
        try {
          onfilterstoggle({ visible: filtersVisible });
        } catch (err) {}
      }
      _prevFiltersVisible = filtersVisible;
    }
  });

  // Watch perPage changes: reset to first page and notify parent
  let _prevPerPage = undefined;
  $effect(() => {
    if (_prevPerPage === undefined) {
      _prevPerPage = perPage;
      return;
    }
    if (perPage !== _prevPerPage) {
      // coerce to number just in case
      perPage = +perPage || 25;
      _prevPerPage = perPage;
      // reset to page 1 (common UX) and notify parent
      currentPage = 1;
      if (onperpage !== undefined) {
        try {
          onperpage({ perPage });
        } catch (err) {}
      }
      if (onpage !== undefined) {
        try {
          onpage({ page: currentPage });
        } catch (err) {}
      }
    }
  });

  // Calculate range for display
  const startItem = $derived(totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1);
  const endItem = $derived(Math.min(currentPage * perPage, totalItems));

  // visiblePages: number of middle numeric buttons to show (not counting first/last)
  const visiblePages = 5;

  const perPageSelectId = `dpc-perpage-${Math.random().toString(36).slice(2, 7)}`;

  // pages array for Pagination component (condensed with ellipses)
  const pages = $derived.by(() => {
    const total = totalPages;
    const current = Math.min(Math.max(1, Math.floor(currentPage)), total);

    // If small number of pages, show all
    if (total <= visiblePages + 2) {
      return Array.from({ length: total }, (_, i) => ({
        name: String(i + 1),
        active: i + 1 === current,
      }));
    }

    const pagesArr = [];
    // always show first
    pagesArr.push({ name: '1', active: current === 1 });

    const half = Math.floor(visiblePages / 2);
    let start = Math.max(2, current - half);
    let end = Math.min(total - 1, current + half);

    // adjust window when near the boundaries
    if (current - 1 <= half) {
      start = 2;
      end = 1 + visiblePages;
    }
    if (total - current <= half) {
      end = total - 1;
      start = total - visiblePages;
    }

    if (start > 2) {
      // compute left jump (midpoint of hidden range 2..start-1)
      const leftHiddenStart = 2;
      const leftHiddenEnd = start - 1;
      const leftJump = Math.max(leftHiddenStart, Math.floor((leftHiddenStart + leftHiddenEnd) / 2));
      pagesArr.push({ name: '…', active: false, ellipsis: 'left', jump: leftJump });
    }

    for (let i = start; i <= end; i++) pagesArr.push({ name: String(i), active: i === current });

    if (end < total - 1) {
      // compute right jump (midpoint of hidden range end+1..total-1)
      const rightHiddenStart = end + 1;
      const rightHiddenEnd = total - 1;
      const rightJump = Math.min(
        rightHiddenEnd,
        Math.ceil((rightHiddenStart + rightHiddenEnd) / 2),
      );
      pagesArr.push({ name: '…', active: false, ellipsis: 'right', jump: rightJump });
    }

    // always show last
    pagesArr.push({ name: String(total), active: current === total });

    return pagesArr;
  });

  // No external tooltip component in use; we rely on native title attribute for ellipses
</script>

<div class="w-full">
  <div class="flex items-center w-full gap-3 px-0 py-0">
    <!-- Search field on the left -->
    <div class="flex-1">
      <div class="flex items-center gap-2">
        <!-- Styled button to open/close filters modal -->
        <div class="flex items-center gap-1 relative">
          <button
            type="button"
            class={'inline-flex items-center gap-2 px-3 py-1 text-sm rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
              (filtersVisible
                ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
                : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700')}
            aria-pressed={filtersVisible}
            aria-label="Toggle filters"
            title="Filters"
            onclick={() => {
              filtersVisible = !filtersVisible;
            }}
          >
            <!-- Funnel icon (Flowbite icon component) -->
            <FilterOutline class="h-4 w-4 shrink-0" />
            <span class="text-sm">Filters</span>
          </button>

          {#if activeFilterCount > 0}
            <!-- positioned badge -->
            <span
              class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full text-white text-xs font-medium"
              style="background-color: var(--vtable-color-accent);">{activeFilterCount}</span
            >
          {/if}
        </div>

        <Search
          size="sm"
          bind:value={search}
          placeholder="Search..."
          clearable
          clearableOnClick={() => {
            search = '';
            if (onsearch !== undefined) {
              onsearch({ search: '' });
            }
          }}
        />
      </div>
    </div>

    <!-- Range count badge + per-page selector -->
    <div class="flex-2 flex items-center gap-2">
      <Badge rounded color="gray">
        Showing {startItem} to {endItem} of {totalItems}
      </Badge>

      <!-- Per-page selector -->
      <div class="flex items-center gap-2">
        <Select id={perPageSelectId} size="sm" items={perPageOptions} bind:value={perPage} />
      </div>
    </div>

    <!-- Pagination navigation -->
    <PaginationBar {pages} {currentPage} onpage={goTo} />
  </div>
</div>

<FiltersModal
  bind:open={filtersVisible}
  {columnFilters}
  {activeFilters}
  {onfilter}
  {direction}
  {showCounts}
  {className}
/>

<style>
  @import '../styles.css';
</style>
