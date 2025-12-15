<script>
  import { Pagination, Search, Badge } from 'flowbite-svelte';
  // Inline SVGs are used instead of importing icons to avoid the dependency on flowbite-svelte-icons
  import { onMount, onDestroy } from 'svelte';

  // Props for search, pagination (but no per-page control)
  let {
    search = '',
    currentPage = 1,
    perPage = 25,  // Fixed value, not user-configurable
    totalItems = 0,
    pagechange = () => {},
    searchchange = () => {}
  } = $props();

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

  // Calculate range for display
  const startItem = $derived(() => totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1);
  const endItem = $derived(() => Math.min(currentPage * perPage, totalItems));

  // visiblePages: number of middle numeric buttons to show (not counting first/last)
  const visiblePages = 5;

  // stable id to query the pagination DOM if needed (fallback)
  const paginationId = `pagination-${Math.random().toString(36).slice(2,9)}`;

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
      const { li, btn, text } = p;
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
    // Find prev/next by detecting non-numeric/non-ellipsis buttons
    const pageList = pages();
    // Build ordered list of page-button lis (numeric and ellipsis)
    const pageLis = [];
    for (const item of lis) {
      const btn = item.querySelector('button, a');
      if (!btn) continue;
      const text = (btn.textContent || '').trim();
      if (/^\d+$/.test(text) || text === '…') pageLis.push({ li: item, btn, text });
    }

    // If clicked on prev/next controls, detect by checking whether clicked li is not in pageLis
    const clickedIsPage = pageLis.some(p => p.li === li);
    if (!clickedIsPage) {
      // determine if it was prev (first li) or next (last li)
      const firstLi = lis[0];
      const lastLi = lis[lis.length - 1];
      if (li === firstLi) {
        previous();
      } else if (li === lastLi) {
        next();
      }
      return;
    }

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

<div class="flex items-center w-full gap-3 px-0 py-0">
  <!-- Search field on the left -->
  <div class="flex-1">
    <Search size="sm" bind:value={search} placeholder="Search..." clearable
            clearableOnClick={() => { search = ''; searchchange?.({ search }); }} />
  </div>

  <!-- Range count badge -->
  <div class="flex-2">
    <Badge rounded color="gray">
      Showing {startItem()} to {endItem()} of {totalItems}
    </Badge>
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

<style>
  @import '../lib/dist/styles.css';
</style>
