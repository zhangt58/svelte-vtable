<script>
  import { Modal } from 'flowbite-svelte';
  import { CloseOutline } from 'flowbite-svelte-icons';
  import DataTableFilters from './DataTableFilters.svelte';

  // Props — make `open` bindable so parent can use `bind:open`
  let {
    open = $bindable(false),
    columnFilters = [],
    activeFilters = {},
    /** @type {string} */
    title = 'Filters',
    /** @type {(..._args: any[]) => void} */
    filterChange = (..._args) => {},
    direction = 'horizontal',
    showCounts = true,
    className = '',
  } = $props();
</script>

<Modal bind:open size="lg" dismissable={false}>
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
    <button
      aria-label="Close"
      class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
      onclick={() => (open = false)}
    >
      <CloseOutline class="shrink-0 h-6 w-6" />
    </button>
  </div>

  <DataTableFilters
    {columnFilters}
    {activeFilters}
    filterChange={(payload) => {
      try {
        return filterChange(payload);
      } catch (e) {}
    }}
    {direction}
    {showCounts}
  />
</Modal>
