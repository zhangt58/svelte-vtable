<script>
  import { Pagination, Search, Badge, Select } from 'flowbite-svelte';
  import { FilterOutline } from 'flowbite-svelte-icons';
  import FiltersModal from './FiltersModal.svelte';
  // Inline SVGs are used instead of importing icons to avoid the dependency on flowbite-svelte-icons
  import { onMount, onDestroy } from 'svelte';

  // Props for search, pagination (perPage made bindable using Svelte 5 rune $bindable)
  let {
    search = '',
    currentPage = 1,
    perPage = $bindable(25),
    totalItems = 0,
    pagechange = () => {},
    searchchange = () => {},
    // control visibility of DataTableFilters above the controls
    filtersVisible = false,
    // callback when toggle changes: filterstoggle({ filtersVisible })
    filterstoggle = () => {},
    // optional DataTableFilters inputs - when provided, this component will render the filters
    columnFilters = [],
    activeFilters = {},
    /** @type {(..._args: any[]) => void} */
    filterChange = (..._args) => {},
    direction = 'horizontal',
    showCounts = true,
    className = '',
    // new callback when perPage changes
    perpagechange = () => {}
  } = $props();

  const perPageOptions = [
    {value: 10, name: "10 rows"},
    {value: 25, name: "25 rows"},
    {value: 50, name: "50 rows"},
    {value: 100, name: "100 rows"}
  ]

  // count of active filters (sum of selected values per column)
  const activeFilterCount = $derived(() => {
    try {
      return Object.values(activeFilters || {}).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
    } catch (e) {
      return 0;
    }
  });

  // totalPages derived from totalItems and perPage
  const totalPages = $derived(() => Math.max(1, Math.ceil(totalItems / perPage)));

  // clamp currentPage into valid range whenever currentPage or totalPages change
  $effect(() => {
    currentPage = Math.min(Math.max(1, +currentPage || 1), totalPages());
  });

  function goTo(p) {
    const np = Math.min(Math.max(1, Math.floor(p)), totalPages());
    if (np !== currentPage) {
      currentPage = np;
      pagechange?.({ currentPage });
    }
  }

  // emit search changes for parent when search updates
  $effect(() => {
    if (typeof search !== 'undefined') searchchange?.({ search });
  });

  // call filterstoggle when filtersVisible changes (avoid on:change typing issues)
  let _prevFiltersVisible = undefined;
  $effect(() => {
    // initialize previous value on first run without emitting
    if (_prevFiltersVisible === undefined) {
      _prevFiltersVisible = filtersVisible;
      return;
    }
    if (filtersVisible !== _prevFiltersVisible) {
      try { filterstoggle?.({ filtersVisible }); } catch (err) {}
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
      try {
        perpagechange?.({ perPage });
      } catch (err) {}
      try {
        pagechange?.({ currentPage });
      } catch (err) {}
    }
  });

  // Calculate range for display
  const startItem = $derived(() => totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1);
  const endItem = $derived(() => Math.min(currentPage * perPage, totalItems));

  // visiblePages: number of middle numeric buttons to show (not counting first/last)
  const visiblePages = 5;

  // stable id to query the pagination DOM if needed (fallback)
  const paginationId = `pagination-${Math.random().toString(36).slice(2,9)}`;
  const perPageSelectId = `dpc-perpage-${Math.random().toString(36).slice(2,7)}`;

  // pages array for Pagination component (condensed with ellipses)
  const pages = $derived(() => {
    const total = totalPages();
    const current = Math.min(Math.max(1, Math.floor(currentPage)), total);

    // If small number of pages, show all
    if (total <= visiblePages + 2) {
      return Array.from({ length: total }, (_, i) => ({ name: String(i + 1), active: i + 1 === current }));
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
      const rightJump = Math.min(rightHiddenEnd, Math.ceil((rightHiddenStart + rightHiddenEnd) / 2));
      pagesArr.push({ name: '…', active: false, ellipsis: 'right', jump: rightJump });
    }

    // always show last
    pagesArr.push({ name: String(total), active: current === total });

    return pagesArr;
  });

  // previous / next callbacks for Pagination
  function previous() {
    goTo(currentPage - 1);
  }
  function next() {
    goTo(currentPage + 1);
  }

  // DOM reference to the pagination container for decorating ellipsis buttons
  let paginationContainerEl = null;

  function decorateEllipsis() {
    if (!paginationContainerEl) return;
    const pageList = pages();
    // find the <ul> inside the pagination container
    let ul = null;
    if (paginationContainerEl && typeof paginationContainerEl.querySelector === 'function') {
      ul = paginationContainerEl.querySelector('ul');
    } else {
      // fallback: query by data attribute on the wrapper
      ul = document.querySelector(`[data-pagination-id="${paginationId}"] ul`);
    }
    if (!ul) return;
    // Ensure the <ul> has Tailwind utility classes for layout
    ul.classList.remove('flex','gap-0.5','p-0','m-0','list-none','items-center');
    ul.classList.add('flex','gap-0.5','p-0','m-0','list-none','items-center');
    const lis = Array.from(ul.children || []);
    // Build a list of page-button <li>s (skip prev/next controls) by checking their textContent
    const pageLis = [];
    for (const li of lis) {
      const btn = li.querySelector('button, a');
      if (!btn) continue;
      const text = (btn.textContent || '').trim();
      // consider numeric pages and ellipsis as page buttons
      if (/^\d+$/.test(text) || text === '…') pageLis.push({ li, btn, text });
    }

    // Now map pageLis to pageList entries in order
    pageLis.forEach((p, idx) => {
      const btn = p.btn;
      const pageObj = pageList[idx];
      if (!pageObj) return;
      // clear previous decorations
      btn.classList.remove('ellipsis-page');
      btn.removeAttribute('data-jump');
      btn.removeAttribute('data-ellipsis');
      btn.removeAttribute('title');

      // Apply Tailwind utility classes instead of inline styles
      // Remove any previously-applied utility classes we manage
      btn.classList.remove(
        'px-2','py-1','text-sm','border','border-gray-300','bg-transparent','min-w-[2rem]',
        'inline-flex','items-center','justify-center','transition-colors','hover:bg-gray-100',
        'bg-green-100','text-green-600','border-transparent','opacity-60','cursor-default','pointer-events-none',
        'tw-ellipsis'
      );

      // Base Tailwind classes for pagination buttons
      btn.classList.add(
        'px-2','py-1','text-sm','border','border-gray-300','bg-transparent','min-w-[2rem]',
        'inline-flex','items-center','justify-center','transition-colors','hover:bg-gray-100'
      );

      // active page styling
      if (pageObj.active) {
        btn.classList.add('bg-green-100','text-green-600','border-transparent');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
        btn.classList.remove('bg-green-100','text-green-600','border-transparent');
      }

      // disabled styling
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
        btn.classList.add('opacity-60','cursor-default','pointer-events-none');
      } else {
        btn.classList.remove('opacity-60','cursor-default','pointer-events-none');
      }

      if (pageObj.name === '…' && typeof pageObj['jump'] === 'number') {
        btn.setAttribute('data-jump', String(pageObj['jump']));
        btn.setAttribute('data-ellipsis', 'true');
        // restore native tooltip for compatibility (browser tooltip)
        btn.setAttribute('title', `Jump to page ${pageObj['jump']}`);
        // visually indicate ellipsis (smaller text) via Tailwind
        btn.classList.add('text-sm','opacity-90');
      }
    });
  }

  // run decoration whenever pages or currentPage change
  $effect(() => {
    pages();
    currentPage;
    // schedule decoration after the browser has painted the updated DOM
    requestAnimationFrame(() => requestAnimationFrame(() => decorateEllipsis()));
  });

  // Re-apply decorations whenever the pagination DOM mutates (childList changes)
  let _observer = null;
  onMount(() => {
    if (!paginationContainerEl) return;
    const run = () => requestAnimationFrame(() => requestAnimationFrame(() => decorateEllipsis()));
    _observer = new MutationObserver(run);
    const root = paginationContainerEl instanceof Element ? paginationContainerEl : document.querySelector(`[data-pagination-id="${paginationId}"]`);
    if (root) _observer.observe(root, { childList: true, subtree: true, attributes: true });
    // initial run
    run();
  });

  onDestroy(() => {
    _observer?.disconnect();
    _observer = null;
  });

  // handle clicks inside Pagination to detect page button clicks
  function handlePaginationClick(e) {
    const el = e.target instanceof Element ? e.target.closest('button, a') : null;
    if (!el) return;
    // find the parent li index so we can map to pages()
    const li = el.closest('li');
    if (!li) return;
    const ul = li.parentElement;
    if (!ul) return;
    const lis = Array.from(ul.children);
    // Build a list of page-button <li>s (skip prev/next controls) by checking their textContent
    const pageLis = [];
    for (const liItem of lis) {
      const btn = liItem.querySelector('button, a');
      if (!btn) continue;
      const text = (btn.textContent || '').trim();
      // consider numeric pages and ellipsis as page buttons
      if (/^\d+$/.test(text) || text === '…') pageLis.push({ li: liItem, btn, text });
    }

    // Map clicked li to decide what to do. If clicked is not a page button (i.e. prev/next),
    // do nothing here because the Pagination component already calls the `previous`/`next` callbacks.
    const clickedIsPage = pageLis.some(p => p.li === li);
    if (!clickedIsPage) {
      return; // rely on Pagination's built-in previous/next handling to avoid double-invocation
    }

    const pageList = pages();

    // Map clicked li to page index
    const pageIdx = pageLis.findIndex(p => p.li === li);
    if (pageIdx < 0 || pageIdx >= pageList.length) return;
    const pageObj = pageList[pageIdx];
    if (!pageObj) return;
    if (pageObj.name === '…' && typeof pageObj['jump'] === 'number') {
      goTo(pageObj['jump']);
      return;
    }
    const n = Number(pageObj.name);
    if (!Number.isNaN(n)) goTo(n);
  }

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
            class={
              "inline-flex items-center gap-2 px-3 py-1 text-sm rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 dark:focus-visible:ring-green-400 " +
              (filtersVisible
                ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
                : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700')
            }
            aria-pressed={filtersVisible}
            aria-label="Toggle filters"
            title="Filters"
            onclick={() => { filtersVisible = !filtersVisible; }}
          >
            <!-- Funnel icon (Flowbite icon component) -->
            <FilterOutline class="h-4 w-4 shrink-0" />
            <span class="text-sm">Filters</span>
          </button>

          {#if activeFilterCount() > 0}
            <!-- positioned badge -->
            <span class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-green-600 text-white text-xs font-medium">{activeFilterCount()}</span>
          {/if}
        </div>

        <Search size="sm" bind:value={search} placeholder="Search..." clearable
                clearableOnClick={() => { search = ''; searchchange?.({ search }); }} />
      </div>
    </div>

    <!-- Range count badge + per-page selector -->
    <div class="flex-2 flex items-center gap-2">
      <Badge rounded color="gray">
        Showing {startItem()} to {endItem()} of {totalItems}
      </Badge>

      <!-- Per-page selector -->
      <div class="flex items-center gap-2">
        <Select id={perPageSelectId} size="sm"
                items={perPageOptions} bind:value={perPage}
        />
      </div>
    </div>

    <!-- Pagination navigation: use Pagination with chevrons and page buttons -->
    <div bind:this={paginationContainerEl} data-pagination-id={paginationId} class="flex items-center gap-0.5" aria-label="Pagination">
      <Pagination
        pages={pages()}
        {previous}
        {next}
        ariaLabel="Pagination"
        onclick={handlePaginationClick}
      >
        {#snippet prevContent()}
          <span class="sr-only">Previous</span>
          <!-- Left chevron SVG (replaces ChevronLeftOutline) -->
          <svg class="shrink-0 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 19l-7-7 7-7" />
          </svg>
        {/snippet}

        {#snippet nextContent()}
          <span class="sr-only">Next</span>
          <!-- Right chevron SVG (replaces ChevronRightOutline) -->
          <svg class="shrink-0 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7" />
          </svg>
        {/snippet}
      </Pagination>
    </div>
  </div>
</div>

<FiltersModal bind:open={filtersVisible}
              columnFilters={columnFilters}
              activeFilters={activeFilters}
              filterChange={(...args) => { try { return filterChange(...args); } catch (e) {} }}
              direction={direction}
              showCounts={showCounts}
              className={className}
/>

<style>
   @import '../lib/dist/styles.css';
</style>