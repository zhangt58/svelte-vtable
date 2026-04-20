<script>
  import { Modal } from 'flowbite-svelte';
  import DataTableFilters from '../DataTableFilters.svelte';

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

<Modal bind:open size="lg" dismissable={false}>
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    <button
      aria-label="Close"
      class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
      onclick={() => (open = false)}
    >
      <svg class="shrink-0 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <DataTableFilters {columnFilters} {activeFilters} {onfilter} {direction} {showCounts} />
</Modal>
