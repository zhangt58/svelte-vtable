<!--
  ThemedExample.svelte
  Demonstrates CSS custom property theming for svelte-vtable.

  Drop-in theme override: set the --vtable-color-* properties on any wrapper
  element (or on :root for a global theme).  No Tailwind configuration needed.
-->
<script>
  import { DataTable, DataTableControls } from '@zhangt58/svelte-vtable';
  import { buildColumnFilters, applyFilters } from '../src/lib/filterUtils.js';
  import { allData, columnDefs } from './sampleData.js';

  // ── shared state ──────────────────────────────────────────────────────────
  let activeFilters = $state({});
  let searchQuery = $state('');
  let currentPage = $state(1);
  let perPage = $state(10);

  const filteredData = $derived(() => {
    let items = applyFilters(allData, activeFilters) || [];
    const q = String(searchQuery || '')
      .trim()
      .toLowerCase();
    if (q) {
      items = items.filter((it) =>
        columnDefs.some((c) =>
          String(it[c.key] ?? '')
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    return items;
  });

  const pagedData = $derived(() => {
    const items = filteredData() || [];
    const start = (Math.max(1, currentPage) - 1) * perPage;
    return items.slice(start, start + perPage);
  });

  let columnFilters = $state(buildColumnFilters(allData, columnDefs));

  // ── active theme ──────────────────────────────────────────────────────────
  /** @type {'green' | 'purple' | 'orange' | 'rose'} */
  let theme = $state('green');

  /** @type {Record<string, Record<string, string>>} */
  const themes = {
    green: {
      '--vtable-color-accent': '#16a34a',
      '--vtable-color-accent-light': '#dcfce7',
      '--vtable-color-accent-border': '#22c55e',
      '--vtable-color-accent-text': '#15803d',
    },
    purple: {
      '--vtable-color-accent': '#7c3aed',
      '--vtable-color-accent-light': '#ede9fe',
      '--vtable-color-accent-border': '#8b5cf6',
      '--vtable-color-accent-text': '#6d28d9',
    },
    orange: {
      '--vtable-color-accent': '#ea580c',
      '--vtable-color-accent-light': '#ffedd5',
      '--vtable-color-accent-border': '#f97316',
      '--vtable-color-accent-text': '#c2410c',
    },
    rose: {
      '--vtable-color-accent': '#e11d48',
      '--vtable-color-accent-light': '#ffe4e6',
      '--vtable-color-accent-border': '#f43f5e',
      '--vtable-color-accent-text': '#be123c',
    },
  };

  // Build inline style string from the active theme map
  const themeStyle = $derived(
    Object.entries(themes[theme])
      .map(([k, v]) => `${k}: ${v}`)
      .join('; '),
  );
</script>

<div class="mb-6">
  <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
    CSS Custom Property Theming
  </h2>
  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    Override <code class="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded"
      >--vtable-color-accent</code
    >
    (and friends) on any wrapper element to re-theme without touching Tailwind config.
  </p>

  <!-- Theme picker -->
  <div class="flex gap-2 flex-wrap mb-4">
    {#each Object.keys(themes) as t}
      <button
        type="button"
        class="px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer capitalize
          {theme === t
          ? 'text-white border-transparent'
          : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        style={theme === t
          ? `background-color: ${themes[t]['--vtable-color-accent']}; border-color: ${themes[t]['--vtable-color-accent-border']};`
          : ''}
        onclick={() => (theme = t)}
      >
        {t}
      </button>
    {/each}
  </div>

  <!-- Themed wrapper: all vtable components inside inherit the CSS variables -->
  <div
    style={themeStyle}
    class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
  >
    <DataTableControls
      search={searchQuery}
      {currentPage}
      bind:perPage
      totalItems={filteredData().length}
      {columnFilters}
      {activeFilters}
      onfilter={({ allFilters }) => {
        activeFilters = { ...allFilters };
        currentPage = 1;
      }}
      onpage={({ page }) => (currentPage = page)}
      onsearch={({ search }) => {
        searchQuery = search;
        currentPage = 1;
      }}
    />

    {#if pagedData().length > 0}
      <div class="mt-2">
        <DataTable
          items={pagedData()}
          columns={columnDefs}
          virtualize={false}
          style="height: 320px; overflow: auto;"
        />
      </div>
    {:else}
      <div class="p-8 text-center text-gray-400 italic text-sm">No matching records.</div>
    {/if}
  </div>

  <!-- How-to snippet -->
  <details class="mt-4">
    <summary class="cursor-pointer text-sm text-gray-500 dark:text-gray-400 select-none">
      How to use this in your own app ▸
    </summary>
    <pre
      class="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-x-auto text-gray-800 dark:text-gray-200">{`<!-- global override in app.css -->
:root {
  --vtable-color-accent:        #7c3aed; /* purple */
  --vtable-color-accent-light:  #ede9fe;
  --vtable-color-accent-border: #8b5cf6;
  --vtable-color-accent-text:   #6d28d9;
}

<!-- OR scoped to a single section -->
<div style="--vtable-color-accent: #7c3aed; --vtable-color-accent-light: #ede9fe; ...">
  <DataTableControls ... />
  <DataTable ... />
</div>`}</pre>
  </details>
</div>
