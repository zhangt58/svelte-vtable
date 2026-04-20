<script>
  import DataTableFilters from './DataTableFilters.svelte';

  // Props — make `open` bindable so parent can use `bind:open`
  let {
    open = $bindable(false),
    columnFilters = [],
    activeFilters = {},
    /** @type {string} */
    title = 'Filters',
    // onfilter({ key, values, allFilters })
    onfilter = undefined,
    direction = 'horizontal',
    showCounts = true,
    className = '',
  } = $props();
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="vtable-modal-backdrop fixed inset-0 bg-black/50 z-40"
    role="presentation"
    onclick={() => (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
  ></div>

  <!-- Modal panel -->
  <div
    class="vtable-modal fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="vtable-modal-title"
  >
    <div
      class="vtable-modal-panel bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl pointer-events-auto overflow-hidden"
    >
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
      >
        <h3 id="vtable-modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <button
          aria-label="Close"
          class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white focus:outline-none"
          onclick={() => (open = false)}
        >
          <svg
            class="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="p-4 overflow-y-auto max-h-[80vh]">
        <DataTableFilters {columnFilters} {activeFilters} {onfilter} {direction} {showCounts} />
      </div>
    </div>
  </div>
{/if}
