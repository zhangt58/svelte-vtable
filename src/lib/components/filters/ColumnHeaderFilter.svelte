<script>
  import FilterValueList from './FilterValueList.svelte';
  import FilterDateRange from './FilterDateRange.svelte';
  import { DEFAULT_RELATIVE_RANGE_PRESETS } from '../../filterUtils.js';

  let {
    column,
    selection = [],
    isOpen = false,
    isActive = false,
    align = 'left',
    showCounts = true,
    virtualThreshold = 500,
    virtualItemHeight = 36,
    virtualOverscan = 5,
    populateThreshold = 200,
    relativeRangePresets = DEFAULT_RELATIVE_RANGE_PRESETS,
    ontoggle = undefined,
    onclear = undefined,
    onvaluetoggle = undefined,
    oncheckall = undefined,
    oninvert = undefined,
    onchecknone = undefined,
    ondaterangechange = undefined,
    onsortchange = undefined,
  } = $props();

  const isDateRange = $derived(column.type === 'daterange' || column.type === 'datetimerange');
  const label = $derived(column.label || column.key);
  const activeBadge = $derived(Array.isArray(selection) ? String(selection.length) : '1');

  function stopEvent(event) {
    event.stopPropagation();
  }

  function handleToggle(event) {
    event.stopPropagation();
    if (ontoggle) ontoggle();
  }

  function handleMenuKeydown(event) {
    if (event.key !== 'Escape') event.stopPropagation();
  }
</script>

<div class="relative inline-flex shrink-0 normal-case tracking-normal">
  <button
    type="button"
    class={'relative inline-flex h-7 w-7 items-center justify-center rounded border text-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 ' +
      (isActive
        ? 'dark:bg-gray-700'
        : 'border-transparent hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-700')}
    style={isActive
      ? 'border-color: var(--vtable-color-accent-border); background-color: color-mix(in srgb, var(--vtable-color-accent-light) 70%, white); color: var(--vtable-color-accent-text);'
      : ''}
    aria-label="Filter {label}"
    aria-expanded={isOpen}
    aria-controls="vtable-filter-menu-{column.key}"
    title="Filter {label}"
    onclick={handleToggle}
  >
    <svg
      class="h-4 w-4"
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
        d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
      />
    </svg>

    {#if isActive}
      <span
        class="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
        style="background-color: var(--vtable-color-accent);"
        aria-hidden="true">{activeBadge}</span
      >
    {/if}
  </button>

  {#if isOpen}
    <div
      id="vtable-filter-menu-{column.key}"
      class="absolute top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-gray-300 bg-white text-left text-sm font-normal normal-case tracking-normal text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:shadow-gray-900"
      class:left-0={align !== 'right'}
      class:right-0={align === 'right'}
      role="dialog"
      aria-label="Filter {label}"
      tabindex="-1"
      onclick={stopEvent}
      onkeydown={handleMenuKeydown}
    >
      <div
        class="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-600"
      >
        <span class="min-w-0 truncate text-xs font-semibold text-gray-600 dark:text-gray-200">
          {label}
        </span>
        {#if isActive}
          <button
            type="button"
            class="shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/20"
            onclick={() => onclear && onclear()}
          >
            Clear
          </button>
        {/if}
      </div>

      {#if isDateRange}
        <FilterDateRange
          {column}
          selection={selection || {}}
          {relativeRangePresets}
          onchange={(updated) => ondaterangechange && ondaterangechange(updated)}
          onclear={() => onclear && onclear()}
        />
      {:else}
        <FilterValueList
          {column}
          selections={selection || []}
          {showCounts}
          {virtualThreshold}
          {virtualItemHeight}
          {virtualOverscan}
          {populateThreshold}
          ontoggle={(value) => onvaluetoggle && onvaluetoggle(value)}
          oncheckall={(values) => oncheckall && oncheckall(values)}
          oninvert={(values) => oninvert && oninvert(values)}
          onchecknone={() => onchecknone && onchecknone()}
          onsortchange={(payload) => onsortchange && onsortchange(payload)}
        />
      {/if}
    </div>
  {/if}
</div>
