<script>
  /**
   * PaginationBar — a self-contained native pagination sub-component.
   *
   * Props:
   *  - pages: { name: string; active: boolean; jump?: number }[]
   *  - currentPage: number
   *  - onpage: (page: number) => void
   */
  let { pages = [], currentPage = 1, onpage = undefined } = $props();

  // Derive total pages from the last entry in the pages array (always the last page number).
  const lastPage = $derived(pages.length > 0 ? +pages[pages.length - 1].name || 1 : 1);

  function goTo(p) {
    if (onpage) onpage(p);
  }
</script>

<nav aria-label="Pagination">
  <ul role="list" class="flex gap-0.5 items-center list-none p-0 m-0">
    <li>
      <button
        type="button"
        aria-label="Previous"
        disabled={currentPage <= 1}
        class="text-sm rounded-l-lg border border-gray-300 bg-transparent w-8 h-8 inline-flex items-center justify-center transition-colors hover:bg-gray-100 disabled:opacity-60 disabled:cursor-default disabled:pointer-events-none"
        onclick={() => goTo(currentPage - 1)}
      >
        <span class="sr-only">Previous</span>
        <svg
          class="shrink-0 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
    </li>

    {#each pages as p}
      <li>
        <button
          type="button"
          aria-current={p.active ? 'page' : undefined}
          title={p.name === '…' ? `Jump to page ${p.jump}` : undefined}
          onclick={() => goTo(p.jump ?? +p.name)}
          class={`w-8 h-8 text-sm border inline-flex items-center justify-center transition-colors${p.active ? ' bg-green-100 text-green-600 border-transparent' : ' border-gray-300 bg-transparent hover:bg-gray-100'}`}
          >{p.name}</button
        >
      </li>
    {/each}

    <li>
      <button
        type="button"
        aria-label="Next"
        disabled={currentPage >= lastPage}
        class="text-sm rounded-r-lg border border-gray-300 bg-transparent w-8 h-8 inline-flex items-center justify-center transition-colors hover:bg-gray-100 disabled:opacity-60 disabled:cursor-default disabled:pointer-events-none"
        onclick={() => goTo(currentPage + 1)}
      >
        <span class="sr-only">Next</span>
        <svg
          class="shrink-0 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </li>
  </ul>
</nav>
