<script>
  import DataTableFilters from '../src/components/DataTableFilters.svelte';
  import { VirtualDataTable, DataTableControls } from '@zhangt58/svelte-vtable';
  import { buildColumnFilters, applyFilters, countActiveFilters } from '../src/lib/filterUtils.js';
  import { DarkMode } from 'flowbite-svelte';
  import { allData, filterColumns, tableColumns } from './sampleData.js';

  // Build column filters using utility function
  let columnFilters = $state(buildColumnFilters(allData, filterColumns));

  // Track active filters
  let activeFilters = $state({});

  // Track layout direction
  let direction = $state('horizontal');

  // Search state
  let searchQuery = $state('');

  // Pagination state (bound to DataTableControls)
  let currentPage = $state(1);
  let perPage = $state(25);

  // Handle filter changes
  function handleFilterChange({ columnKey, selectedValues, allFilters }) {
    activeFilters = { ...allFilters };
    // reset to first page when filters change
    currentPage = 1;
    console.log('Filter changed:', { columnKey, selectedValues, allFilters });
  }

  // Apply filters to data using utility function, then apply search
  const filteredData = $derived(() => {
    let items = applyFilters(allData, activeFilters) || [];
    const q = String(searchQuery || '').trim();
    if (q.length > 0) {
      const low = q.toLowerCase();
      items = items.filter(it => tableColumns.some(c => String(it[c.key] ?? '').toLowerCase().includes(low)));
    }
    return items;
  });

  // Reset to first page when the search query changes (only when it actually changes)
  let _prevSearch = '';
  $effect(() => {
    const q = String(searchQuery || '');
    if (q !== _prevSearch) {
      currentPage = 1;
      _prevSearch = q;
    }
  });

  // Compute paged slice for current page
  const pagedData = $derived(() => {
    const items = filteredData() || [];
    const cp = Math.max(1, Math.floor(currentPage || 1));
    const start = (cp - 1) * perPage;
    return items.slice(start, start + perPage);
  });

  // Count active filters using utility function
  const activeCount = $derived(() => countActiveFilters(activeFilters));

  // Create column width mapping for VirtualDataTable
  const colWidths = Object.fromEntries(
    tableColumns.map(col => [col.key, col.stretch])
  );

  // Touch derived values to avoid "unused variable" warnings in this example file
  $effect(() => {
    // call derived to register usage and reference colWidths
    try { void activeCount(); } catch (e) {}
    try { void colWidths; } catch (e) {}
  });
</script>

{#snippet rowSnippet({ item, index, select, selected })}
  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
    {#each tableColumns as col}
      <td class="p-3 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200">{item[col.key]}</td>
    {/each}
  </tr>
{/snippet}

<div class="mb-8">
  <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Svelte-VTable Library Demo</h1>

  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
    <h2 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">Features Demonstrated</h2>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">DataTableFilters</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Multi-column filtering with OR logic within columns and AND logic across columns</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">VirtualDataTable</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">High-performance virtualized table with sorting and custom row rendering</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">DataTableControls</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Pagination and table navigation controls</p>
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-indigo-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Dark Mode</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Complete theme switching support with Tailwind CSS</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Responsive Design</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Mobile-friendly layouts and flexible component configurations</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Integration</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Seamless component composition and data flow between filters, table, and controls</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex justify-between items-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
    <div class="flex gap-2">
      <button
        class="px-4 py-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {direction === 'horizontal' ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600' : ''}"
        onclick={() => direction = 'horizontal'}
      >
        Horizontal Layout
      </button>
      <button
        class="px-4 py-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {direction === 'vertical' ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600' : ''}"
        onclick={() => direction = 'vertical'}
      >
        Vertical Layout
      </button>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-sm text-gray-600 dark:text-gray-300">{activeCount()} active filters</div>
      <DarkMode />
    </div>
  </div>

  <DataTableFilters
    {columnFilters}
    {direction}
    {activeFilters}
    filterChange={handleFilterChange}
    showCounts={true}
  />
</div>

<div class="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
  <DataTableControls
    search={searchQuery}
    currentPage={currentPage}
    pagechange={(payload) => { currentPage = payload.currentPage }}
    searchchange={(payload) => { searchQuery = payload.search }}
    bind:perPage={perPage}
    totalItems={filteredData().length}
    columnFilters={columnFilters}
    activeFilters={activeFilters}
    filterChange={handleFilterChange}
    direction={direction}
    showCounts={true}
    class="mt-1"
  />
  {#if filteredData().length > 0}
    <div class="mt-2">
      <VirtualDataTable
        items={pagedData()}
        visibleKeys={tableColumns.map(col => col.key)}
        class="border border-gray-200 dark:border-gray-600 rounded overflow-auto scrollbar-thin"
        rowSnippet={rowSnippet}
        colWidths={colWidths}
        virtualize={false}
        style="height:400px; overflow:auto;"
      />
    </div>
  {:else}
    <div class="p-8 text-center text-gray-400 dark:text-gray-400 italic">
      No records match the selected filters. Try adjusting or clearing filters.
    </div>
  {/if}
</div>
