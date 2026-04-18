<script>
  import { DataTable, DataTableControls, DataTableFilters } from '@zhangt58/svelte-vtable';
  import { buildColumnFilters, applyFilters, countActiveFilters } from '@zhangt58/svelte-vtable';
  import { DarkMode } from 'flowbite-svelte';
  import { allData, columnDefs } from './sampleData.js';
  import ThemedExample from './ThemedExample.svelte';

  // Build column filters from the unified columnDefs array.
  // Columns with filterType:'none' are automatically excluded.
  let columnFilters = $state(buildColumnFilters(allData, columnDefs));

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
  function handleFilterChange({ key, values, allFilters }) {
    activeFilters = { ...allFilters };
    // reset to first page when filters change
    currentPage = 1;
  }

  // Apply filters to data using utility function, then apply search
  const filteredData = $derived(() => {
    let items = applyFilters(allData, activeFilters) || [];
    const q = String(searchQuery || '').trim();
    if (q.length > 0) {
      const low = q.toLowerCase();
      items = items.filter((it) =>
        columnDefs.some((c) =>
          String(it[c.key] ?? '')
            .toLowerCase()
            .includes(low),
        ),
      );
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
</script>

<div class="mb-8">
  <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
    Svelte-VTable Library Demo
  </h1>

  <div
    class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6"
  >
    <h2 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
      Features Demonstrated
    </h2>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">DataTableFilters</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Multi-column filtering with OR logic within columns and AND logic across columns
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">DataTable</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              High-performance virtualized table with sorting and custom row rendering
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">DataTableControls</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Pagination and table navigation controls
            </p>
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-indigo-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Dark Mode</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Complete theme switching support with Tailwind CSS
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-orange-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Responsive Design</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Mobile-friendly layouts and flexible component configurations
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0"></div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Integration</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Seamless component composition and data flow between filters, table, and controls
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    class="flex justify-between items-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
  >
    <div class="flex gap-2">
      <button
        class="px-4 py-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {direction ===
        'horizontal'
          ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
          : ''}"
        onclick={() => (direction = 'horizontal')}
      >
        Horizontal Layout
      </button>
      <button
        class="px-4 py-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 {direction ===
        'vertical'
          ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
          : ''}"
        onclick={() => (direction = 'vertical')}
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
    onfilter={handleFilterChange}
    showCounts={true}
  />
</div>

<div
  class="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
>
  <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
    A single <code>columnDefs</code> array drives headers, widths, sorting, filters, and default
    cell rendering — no separate <code>visibleKeys</code>, <code>colWidths</code>, or
    <code>rowSnippet</code> required.
  </p>

  <DataTableControls
    search={searchQuery}
    {currentPage}
    onpage={(payload) => {
      currentPage = payload.page;
    }}
    onsearch={(payload) => {
      searchQuery = payload.search;
    }}
    bind:perPage
    totalItems={filteredData().length}
    {columnFilters}
    {activeFilters}
    onfilter={handleFilterChange}
    {direction}
    showCounts={true}
    class="mt-1"
  />

  <div class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-1">
    {activeCount()} active filter(s) · {filteredData().length} total records
  </div>

  {#if filteredData().length > 0}
    <div class="mt-2">
      <!--
        Pass `columns` instead of `visibleKeys`+`colWidths`+`rowSnippet`.
        The DataTable renders a default row, using each column's `cellSnippet`
        when provided, or the raw value otherwise.

        Snippets must be defined in a Svelte component — they are merged into
        the columnDefs array here before being passed as the `columns` prop.
      -->

      <!-- Cell snippet: id — monospace "#N" label -->
      {#snippet idCell({ value })}
        <span class="font-mono text-gray-400 dark:text-gray-500 text-xs">#{value}</span>
      {/snippet}

      <!-- Cell snippet: status — colour-coded badge -->
      {#snippet statusCell({ value })}
        {@const cls =
          value === 'Active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
            : value === 'Inactive'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {cls}"
          >{value}</span
        >
      {/snippet}

      <!-- Cell snippet: level — colour-coded pill -->
      {#snippet levelCell({ value })}
        {@const cls =
          value === 'Lead'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
            : value === 'Senior'
              ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
              : value === 'Mid'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'}
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {cls}"
          >{value}</span
        >
      {/snippet}

      <DataTable
        items={pagedData()}
        columns={columnDefs.map((c) =>
          c.key === 'id'
            ? { ...c, cellSnippet: idCell }
            : c.key === 'status'
              ? { ...c, cellSnippet: statusCell }
              : c.key === 'level'
                ? { ...c, cellSnippet: levelCell }
                : c,
        )}
        class="border border-gray-200 dark:border-gray-600 rounded overflow-auto scrollbar-thin"
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

<div
  class="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700"
>
  <ThemedExample />
</div>
