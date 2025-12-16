<script>
  import DataTableFilters from '../src/components/DataTableFilters.svelte';
  import { buildColumnFilters, applyFilters, countActiveFilters } from '../src/lib/filterUtils.js';

  // Sample dataset with various columns
  const allData = [
    { id: 1, name: 'Alice Johnson', department: 'Engineering', status: 'Active', level: 'Senior' },
    { id: 2, name: 'Bob Smith', department: 'Engineering', status: 'Active', level: 'Junior' },
    { id: 3, name: 'Carol Williams', department: 'Marketing', status: 'Active', level: 'Mid' },
    { id: 4, name: 'David Brown', department: 'Sales', status: 'Inactive', level: 'Senior' },
    { id: 5, name: 'Eve Davis', department: 'Engineering', status: 'Active', level: 'Mid' },
    { id: 6, name: 'Frank Miller', department: 'HR', status: 'Active', level: 'Junior' },
    { id: 7, name: 'Grace Wilson', department: 'Marketing', status: 'Active', level: 'Senior' },
    { id: 8, name: 'Henry Moore', department: 'Sales', status: 'Inactive', level: 'Mid' },
    { id: 9, name: 'Ivy Taylor', department: 'Engineering', status: 'Active', level: 'Senior' },
    { id: 10, name: 'Jack Anderson', department: 'HR', status: 'Active', level: 'Junior' },
    { id: 11, name: 'Kelly Thomas', department: 'Marketing', status: 'Inactive', level: 'Mid' },
    { id: 12, name: 'Leo Jackson', department: 'Sales', status: 'Active', level: 'Senior' },
  ];

  // Define columns to filter on
  const columns = [
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
    { key: 'level', label: 'Level' }
  ];

  // Build column filters using utility function
  let columnFilters = $state(buildColumnFilters(allData, columns));

  // Track active filters
  let activeFilters = $state({});

  // Track layout direction
  let direction = $state('horizontal');

  // Handle filter changes
  function handleFilterChange({ columnKey, selectedValues, allFilters }) {
    activeFilters = { ...allFilters };
    console.log('Filter changed:', { columnKey, selectedValues, allFilters });
  }

  // Apply filters to data using utility function
  const filteredData = $derived(() => applyFilters(allData, activeFilters));

  // Count active filters using utility function
  const activeCount = $derived(() => countActiveFilters(activeFilters));
</script>

<div class="demo-section">
  <div class="direction-toggle">
    <button
      class:active={direction === 'horizontal'}
      onclick={() => direction = 'horizontal'}
    >
      Horizontal Layout
    </button>
    <button
      class:active={direction === 'vertical'}
      onclick={() => direction = 'vertical'}
    >
      Vertical Layout
    </button>
  </div>

  <DataTableFilters
    {columnFilters}
    {direction}
    {activeFilters}
    filterChange={handleFilterChange}
    showCounts={true}
  />
</div>

<div class="filtered-data">
  <h3>
    Filtered Results: {filteredData().length} of {allData.length} records
    {#if activeCount() > 0}
      <span style="color: #6b7280; font-weight: normal;">
        ({activeCount()} filter{activeCount() !== 1 ? 's' : ''} active)
      </span>
    {/if}
  </h3>

  {#if filteredData().length > 0}
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Status</th>
          <th>Level</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredData() as item}
          <tr>
            <td>{item.id}</td>
            <td>{item.name}</td>
            <td>{item.department}</td>
            <td>{item.status}</td>
            <td>{item.level}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="no-data">
      No records match the selected filters. Try adjusting or clearing filters.
    </div>
  {/if}
</div>

