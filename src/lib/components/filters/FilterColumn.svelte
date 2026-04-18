<script>
  import { ChevronDownOutline } from 'flowbite-svelte-icons';

  /**
   * Renders a single column's toggle button header with label, badge, and chevron.
   *
   * Props:
   *   column         — column config object { key, label, type, ... }
   *   isOpen         — whether the dropdown is currently open
   *   isActive       — whether the column has any active filters
   *   selection      — current selection (array for value filters, object for date range)
   *   ontoggle       — callback invoked when the button is clicked
   */
  let { column, isOpen = false, isActive = false, selection = [], ontoggle } = $props();

  const selectionIsRange = $derived(!Array.isArray(selection));
  const selectionCount = $derived(Array.isArray(selection) ? selection.length : 0);
</script>

<button
  id="filter-{column.key}"
  class="w-full flex justify-between items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all cursor-pointer gap-2"
  style={isActive
    ? 'border-color: var(--vtable-color-accent-border); background-color: color-mix(in srgb, var(--vtable-color-accent-light) 40%, transparent);'
    : ''}
  onclick={ontoggle}
  type="button"
>
  <span class="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
    {column.label || column.key}
  </span>
  {#if isActive}
    {#if !selectionIsRange}
      <span
        class="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style="background-color: var(--vtable-color-accent);">{selectionCount}</span
      >
    {:else}
      <span
        class="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style="background-color: var(--vtable-color-accent);">range</span
      >
    {/if}
  {/if}
  <ChevronDownOutline class="w-5 h-5 shrink-0 transition-transform {isOpen ? 'rotate-180' : ''}" />
</button>
