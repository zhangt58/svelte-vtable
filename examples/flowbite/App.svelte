<script>
  // Flowbite-flavoured DataTableControls — imported from the /flowbite entrypoint.
  // This requires flowbite-svelte and flowbite-svelte-icons as peer dependencies.
  import {
    DataTable,
    DataTableControls,
    DataTableFilters,
    buildColumnFilters,
    applyFilters,
    countActiveFilters,
  } from '@zhangt58/svelte-vtable/flowbite';
  import { DarkMode } from 'flowbite-svelte';

  // ── sample data ──────────────────────────────────────────────────────────────
  const allData = [
    { id: 1, name: 'Alice', dept: 'Engineering', status: 'Active' },
    { id: 2, name: 'Bob', dept: 'Sales', status: 'Inactive' },
    { id: 3, name: 'Carol', dept: 'Engineering', status: 'Active' },
    { id: 4, name: 'David', dept: 'Marketing', status: 'Pending' },
    { id: 5, name: 'Eve', dept: 'Sales', status: 'Active' },
  ];

  const columnDefs = [
    { key: 'id', label: 'ID', sortable: true, filterType: 'none', width: 0.5 },
    { key: 'name', label: 'Name', sortable: true, filterType: 'none', width: 2 },
    { key: 'dept', label: 'Department', sortable: true, filterType: 'list', width: 1.5 },
    { key: 'status', label: 'Status', sortable: true, filterType: 'list', width: 1 },
  ];

  // ── state ─────────────────────────────────────────────────────────────────────
  let columnFilters = $state(buildColumnFilters(allData, columnDefs));
  let activeFilters = $state({});
  let searchQuery = $state('');
  let currentPage = $state(1);
  let perPage = $state(25);

  function handleFilterChange({ allFilters }) {
    activeFilters = { ...allFilters };
    currentPage = 1;
  }

  const filteredData = $derived(() => {
    let items = applyFilters(allData, activeFilters) || [];
    const q = String(searchQuery || '').trim().toLowerCase();
    if (q) {
      items = items.filter((it) =>
        columnDefs.some((c) => String(it[c.key] ?? '').toLowerCase().includes(q)),
      );
    }
    return items;
  });

  $effect(() => {
    currentPage = 1;
    searchQuery; // track
  });

  const pagedData = $derived(() => {
    const items = filteredData();
    const start = (Math.max(1, currentPage) - 1) * perPage;
    return items.slice(start, start + perPage);
  });

  const activeCount = $derived(() => countActiveFilters(activeFilters));
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-4">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
      Flowbite Adapter Example
    </h1>
    <!-- Flowbite DarkMode toggle -->
    <DarkMode />
  </div>

  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    This example uses <code>DataTableControls</code> from
    <code>@zhangt58/svelte-vtable/flowbite</code>. The controls are rendered using
    <strong>flowbite-svelte</strong> components (Search, Badge, Select, Modal).
  </p>

  <DataTableFilters
    {columnFilters}
    {activeFilters}
    onfilter={handleFilterChange}
    showCounts={true}
  />

  <div class="mt-4">
    <!-- Flowbite-flavoured controls: Search + Badge + Select + Modal -->
    <DataTableControls
      search={searchQuery}
      {currentPage}
      onpage={(p) => (currentPage = p.page)}
      onsearch={(p) => (searchQuery = p.search)}
      bind:perPage
      totalItems={filteredData().length}
      {columnFilters}
      {activeFilters}
      onfilter={handleFilterChange}
    />

    <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      {activeCount()} active filter(s) · {filteredData().length} total records
    </div>

    {#if filteredData().length > 0}
      <div class="mt-2">
        <DataTable
          items={pagedData()}
          columns={columnDefs}
          style="height:300px; overflow:auto;"
          virtualize={false}
          class="border border-gray-200 dark:border-gray-600 rounded overflow-auto"
        />
      </div>
    {:else}
      <div class="p-8 text-center text-gray-400 italic">No records match the filters.</div>
    {/if}
  </div>
</div>
