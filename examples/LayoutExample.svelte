<!--
  LayoutExample.svelte
  Layout features for long, wide tables: sticky columns, grouped headers,
  resizable columns (saved in localStorage), long text (wrap or truncate with
  tooltips) and row density — on an online-store order list with 13 columns.
-->
<script>
  import { DataTable } from '@zhangt58/svelte-vtable';
  import { allData } from './sampleData.js';

  // ── data: store orders derived from the shared sample rows ────────────────
  const companies = [
    'Acme Corporation',
    'Globex',
    'Initech',
    'Umbrella Logistics and Warehousing',
    'Stark Industries',
    'Wayne Enterprises International Holdings',
    '',
    '',
  ];
  const cities = ['Lisbon', 'Toronto', 'Melbourne', 'Osaka', 'Nairobi', 'Denver'];
  const channels = ['Web', 'Mobile app', 'Phone', 'Marketplace'];
  const statuses = ['Delivered', 'Shipped', 'Processing', 'Returned'];
  const coupons = ['', '', 'WELCOME10', 'FREESHIP', 'SPRING-SALE-25'];
  const carriers = ['DHL', 'UPS', 'FedEx', 'Local courier'];
  const speeds = ['Standard', 'Express', 'Next day'];

  const rows = allData.slice(0, 120).map((r, i) => ({
    id: 10000 + r.id,
    name: r.name,
    company: companies[i % companies.length],
    email: `${r.name.toLowerCase().replace(' ', '.')}${r.id}@example.com`,
    city: cities[(i * 7) % cities.length],
    ordered: r.createdAt.replace('T', ' '),
    channel: channels[(i * 5) % channels.length],
    status: statuses[(i * 3) % statuses.length],
    total: Math.round(((i * 37) % 480) + 19.99) + 0.99,
    coupon: coupons[(i * 3) % coupons.length],
    carrier: carriers[(i * 11) % carriers.length],
    speed: speeds[(i * 5) % speeds.length],
    // 10–34 words: long enough to truncate, short enough to wrap to a few lines.
    notes: r.description
      .split(' ')
      .slice(0, 10 + ((i * 7) % 25))
      .join(' ')
      .replace(/[.,]?$/, '.'),
  }));

  // ── feature switches ──────────────────────────────────────────────────────
  let sticky = $state(true);
  let grouped = $state(true);
  let resizable = $state(true);
  let wrap = $state(false);
  let density = $state('comfortable');
  let columnWidths = $state({});
  // Raw: a proxied row would never equal the row DataTable compares against.
  let selected = $state.raw(null);
  let table = $state();
  const customWidths = $derived(Object.keys(columnWidths).length);

  const baseColumns = [
    { key: 'id', label: 'Order', minWidth: '4.5rem', sticky: 'left' },
    { key: 'name', label: 'Customer', minWidth: '13rem', group: 'Customer', sticky: 'left' },
    { key: 'email', label: 'Email', minWidth: '16rem', group: 'Customer' },
    { key: 'city', label: 'City', minWidth: '7rem', group: 'Customer' },
    { key: 'ordered', label: 'Ordered', minWidth: '10rem', group: 'Order' },
    { key: 'channel', label: 'Channel', minWidth: '7rem', group: 'Order' },
    { key: 'status', label: 'Status', minWidth: '7rem', group: 'Order' },
    {
      key: 'total',
      label: 'Total',
      minWidth: '6rem',
      group: 'Order',
      exportValue: (item) => item.total.toFixed(2),
    },
    { key: 'coupon', label: 'Coupon', minWidth: '9rem', group: 'Order' },
    { key: 'carrier', label: 'Carrier', minWidth: '7rem', group: 'Delivery' },
    { key: 'speed', label: 'Speed', minWidth: '6rem', group: 'Delivery' },
    { key: 'notes', label: 'Notes', minWidth: '18rem', sortable: false },
    {
      key: 'actions',
      label: '',
      minWidth: '5rem',
      sticky: 'right',
      sortable: false,
      exportable: false,
    },
  ];

  /** Feature card: title, control(s), what to try. */
  const cards = $derived([
    {
      title: 'Sticky columns',
      hint: 'Scroll the table sideways: Order and Customer stay on the left, the row action on the right.',
    },
    {
      title: 'Grouped headers',
      hint: 'Customer / Order / Delivery span their columns and stick with the header.',
    },
    {
      title: 'Resizable columns',
      hint: 'Drag a header’s right edge. Double-click resets. Widths survive a reload.',
    },
    {
      title: 'Long text',
      hint: 'Truncate keeps rows on one line — hover a cut-off cell (Notes, Customer) for the full text.',
    },
    { title: 'Row density', hint: 'Compact tightens the cell padding to fit more rows.' },
  ]);

  const statusCls = {
    Delivered: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    Shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    Processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Returned: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };
</script>

{#snippet toggle(label, checked, onchange)}
  <label class="inline-flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      class="h-4 w-4 accent-green-600"
      {checked}
      onchange={(e) => onchange(e.currentTarget.checked)}
    />
    <span>{label}</span>
  </label>
{/snippet}

{#snippet segmented(options, value, onchange)}
  <div
    class="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs"
  >
    {#each options as [v, label]}
      <button
        type="button"
        class="px-2.5 py-1 cursor-pointer transition-colors {value === v
          ? 'bg-green-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}"
        aria-pressed={value === v}
        onclick={() => onchange(v)}>{label}</button
      >
    {/each}
  </div>
{/snippet}

{#snippet nameCell({ item })}
  <div class="min-w-0">
    <div class="truncate font-medium">{item.name}</div>
    {#if item.company}
      <div class="truncate text-xs text-gray-500 dark:text-gray-400">{item.company}</div>
    {/if}
  </div>
{/snippet}

{#snippet idCell({ value })}
  <span class="font-mono text-xs text-gray-400 dark:text-gray-500">#{value}</span>
{/snippet}

{#snippet statusCell({ value })}
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusCls[value]}"
    >{value}</span
  >
{/snippet}

{#snippet totalCell({ value })}
  <span class="block text-right tabular-nums">${value.toFixed(2)}</span>
{/snippet}

{#snippet couponCell({ value })}
  {#if value}
    <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{value}</code>
  {:else}
    <span class="text-gray-400">—</span>
  {/if}
{/snippet}

{#snippet actionsCell({ item })}
  <button
    type="button"
    class="px-2 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer"
    onclick={(e) => {
      e.stopPropagation();
      selected = item;
    }}>View</button
  >
{/snippet}

<div>
  <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Wide tables</h2>
  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    A 13-column order list wider than the page. Every layout feature is on; switch them off one by
    one to compare.
  </p>

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4 text-sm">
    {#each cards as card, i}
      <div
        class="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
      >
        <div class="font-semibold text-gray-900 dark:text-gray-100">{card.title}</div>
        <div class="text-gray-700 dark:text-gray-200 min-h-7 flex items-center gap-2 flex-wrap">
          {#if i === 0}
            {@render toggle('Pin columns', sticky, (v) => (sticky = v))}
          {:else if i === 1}
            {@render toggle('Show group row', grouped, (v) => (grouped = v))}
          {:else if i === 2}
            {@render toggle('Enable', resizable, (v) => (resizable = v))}
            <button
              type="button"
              class="text-xs underline text-green-700 dark:text-green-400 disabled:text-gray-400 disabled:no-underline cursor-pointer disabled:cursor-default"
              disabled={!resizable || customWidths === 0}
              onclick={() => (columnWidths = {})}>Reset</button
            >
          {:else if i === 3}
            {@render segmented(
              [
                [false, 'Truncate'],
                [true, 'Wrap'],
              ],
              wrap,
              (v) => (wrap = v),
            )}
          {:else}
            {@render segmented(
              [
                ['comfortable', 'Comfortable'],
                ['compact', 'Compact'],
              ],
              density,
              (v) => (density = v),
            )}
          {/if}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-snug">{card.hint}</p>
      </div>
    {/each}
  </div>

  <div
    class="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400"
  >
    <span class="inline-flex items-center gap-3">
      {rows.length} orders
      <button
        type="button"
        class="px-2 py-0.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
        title="Save the table's rows in their current sort order as CSV (table.exportCSV())"
        onclick={() => table?.exportCSV({ filename: 'orders.csv' })}>Export CSV</button
      >
    </span>
    <span>
      {#if resizable && customWidths > 0}
        Custom widths for {customWidths} columns · saved in localStorage (<code
          >svelte-vtable:column-widths:demo-orders</code
        >)
      {:else}
        Declared widths (minWidth per column)
      {/if}
    </span>
  </div>

  <DataTable
    bind:this={table}
    items={rows}
    columns={baseColumns.map((c) => ({
      ...c,
      sticky: sticky ? c.sticky : undefined,
      group: grouped ? c.group : undefined,
      cellSnippet: {
        id: idCell,
        name: nameCell,
        status: statusCell,
        total: totalCell,
        coupon: couponCell,
        actions: actionsCell,
      }[c.key],
    }))}
    {density}
    {wrap}
    {resizable}
    bind:columnWidths
    storageKey="demo-orders"
    {selected}
    onselect={({ item }) => (selected = item)}
    virtualize={false}
    class="border border-gray-200 dark:border-gray-600 rounded"
    style="height: 460px;"
  />

  <p class="mt-2 text-xs text-gray-500 dark:text-gray-400 min-h-4">
    {#if selected}
      Selected: #{selected.id} {selected.name} — {selected.email}
    {:else}
      Click a row or its View button to select it.
    {/if}
  </p>
</div>
