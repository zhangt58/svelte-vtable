<script>
  /**
   * Renders the checkbox value-list for a single filter column, including:
   *   - per-column search bar
   *   - sort buttons (name / number / count)
   *   - check-all toolbar (All / Invert / None)
   *   - checkbox list with optional virtualization and load-on-demand
   *
   * Props:
   *   column             — column config { key, label, uniqueValues, counts, ... }
   *   selections         — current selected values array for this column
   *   showCounts         — whether to show value counts next to each option
   *   virtualThreshold   — render virtual list when options exceed this count
   *   virtualItemHeight  — px height of each checkbox row (for virtual layout)
   *   virtualOverscan    — extra rows to render above/below the visible window
   *   populateThreshold  — hide options and show "Load options" when count exceeds this
   *   ontoggle           — callback(value) when a checkbox is toggled
   *   oncheckall         — callback(values) when "All" is clicked
   *   oninvert           — callback(values) when "Invert" is clicked
   *   onchecknone        — callback() when "None" is clicked
   *   onsortchange       — callback({ mode, dir }) when sort button is clicked
   */
  let {
    column,
    selections = [],
    showCounts = true,
    virtualThreshold = 500,
    virtualItemHeight = 36,
    virtualOverscan = 5,
    populateThreshold = 200,
    ontoggle,
    oncheckall,
    oninvert,
    onchecknone,
    onsortchange,
  } = $props();

  // Internal: whether large option sets have been loaded (computed lazily from props)
  const autoLoaded = $derived(
    populateThreshold <= 0 ||
      (Array.isArray(column.uniqueValues) ? column.uniqueValues.length : 0) <= populateThreshold,
  );
  let manuallyLoaded = $state(false);
  const loaded = $derived(autoLoaded || manuallyLoaded);

  // Internal: sort state
  let sortMode = $state('name');
  let sortDir = $state('asc');

  // Internal: per-column search query
  let searchQuery = $state('');

  // Virtual list scroll tracking
  let listRef = $state(null);
  let scrollTop = $state(0);
  let containerHeight = $state(200);

  $effect(() => {
    if (!listRef) return;
    const ro = new ResizeObserver(() => {
      containerHeight = listRef.clientHeight || 200;
    });
    ro.observe(listRef);
    containerHeight = listRef.clientHeight || 200;
    return () => ro.disconnect();
  });

  function handleScroll(e) {
    scrollTop = e.currentTarget.scrollTop;
  }

  // Helper: extract numeric sort key from a value
  function extractNumber(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    const match = String(v).match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Sorted + filtered option values for this column
  const sortedValues = $derived.by(() => {
    const raw = Array.isArray(column.uniqueValues) ? column.uniqueValues.slice() : [];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? raw.filter((v) => {
          const text = v === null || v === undefined ? '(empty)' : String(v);
          return text.toLowerCase().includes(q);
        })
      : raw;

    const dir = sortDir === 'asc' ? 1 : -1;
    const withIndex = filtered.map((v, i) => ({ v, i }));
    withIndex.sort((a, b) => {
      const va = a.v;
      const vb = b.v;
      if (sortMode === 'count' && column.counts) {
        const ca = Number(column.counts[va] ?? 0);
        const cb = Number(column.counts[vb] ?? 0);
        if (ca !== cb) return (ca - cb) * dir * -1;
      }
      if (sortMode === 'number') {
        const na = extractNumber(va);
        const nb = extractNumber(vb);
        if (na !== nb) return (na - nb) * dir;
      }
      const sa = va === null || va === undefined ? '(empty)' : String(va);
      const sb = vb === null || vb === undefined ? '(empty)' : String(vb);
      const la = sa.toLowerCase();
      const lb = sb.toLowerCase();
      if (la < lb) return -1 * dir;
      if (la > lb) return 1 * dir;
      return a.i - b.i;
    });
    return withIndex.map((x) => x.v);
  });

  // Virtual slice when options exceed threshold
  const virtualSlice = $derived.by(() => {
    if (!sortedValues || sortedValues.length <= virtualThreshold) return null;
    const itemH = virtualItemHeight;
    const height = containerHeight;
    const overscan = virtualOverscan;
    const start = Math.max(0, Math.floor(scrollTop / itemH) - overscan);
    const visibleCount = Math.ceil(height / itemH) + overscan * 2;
    const end = Math.min(sortedValues.length, start + visibleCount);
    return {
      slice: sortedValues.slice(start, end),
      top: start * itemH,
      totalHeight: sortedValues.length * itemH,
    };
  });

  function handleSortClick(mode) {
    if (sortMode === mode) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortMode = mode;
      sortDir = 'desc';
    }
    if (onsortchange) onsortchange({ mode: sortMode, dir: sortDir });
  }
</script>

<!-- Search bar + sort buttons -->
<div class="px-1 py-1 border-b border-gray-200 dark:border-gray-600">
  <div class="flex items-center gap-1 w-full min-w-0">
    <input
      type="text"
      placeholder="Filter..."
      class="p-1 flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
      bind:value={searchQuery}
    />
    <div class="flex items-center gap-1">
      <!-- Sort by name -->
      <button
        class="p-0.5 flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
        class:bg-blue-100={sortMode === 'name'}
        class:dark:bg-blue-900={sortMode === 'name'}
        onclick={() => handleSortClick('name')}
        title="Sort by name"
        type="button"
      >
        <span
          class="flex flex-col items-center leading-none font-semibold"
          style="font-size:0.6rem;"
        >
          <span>A</span>
          <span>Z</span>
        </span>
        <svg
          class={'w-3 h-3 transition-transform ' +
            (sortMode === 'name'
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-gray-400 dark:text-gray-500')}
          style={sortMode === 'name' && sortDir === 'asc' ? 'transform: rotate(180deg);' : ''}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <!-- Sort by number -->
      <button
        class="p-0.5 flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
        class:bg-blue-100={sortMode === 'number'}
        class:dark:bg-blue-900={sortMode === 'number'}
        onclick={() => handleSortClick('number')}
        title="Sort by number"
        aria-label="Sort by number"
        type="button"
      >
        <span
          class="flex flex-col items-center leading-none font-semibold"
          style="font-size:0.6rem;"
        >
          <span>0</span>
          <span>9</span>
        </span>
        <svg
          class={'w-3 h-3 transition-transform ' +
            (sortMode === 'number'
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-gray-400 dark:text-gray-500')}
          style={sortMode === 'number' && sortDir === 'asc' ? 'transform: rotate(180deg);' : ''}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <!-- Sort by count (only when counts are available) -->
      {#if showCounts && column.counts}
        <button
          class="p-0.5 flex-1 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          class:bg-blue-100={sortMode === 'count'}
          class:dark:bg-blue-900={sortMode === 'count'}
          onclick={() => handleSortClick('count')}
          title="Sort by count"
          type="button"
        >
          <span class="text-sm font-semibold">#</span>
          <svg
            class={'w-3 h-3 transition-transform ' +
              (sortMode === 'count'
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-400 dark:text-gray-500')}
            style={sortMode === 'count' && sortDir === 'asc' ? 'transform: rotate(180deg);' : ''}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</div>

<!-- Check-all toolbar -->
<div class="px-2 py-1 border-b border-gray-100 dark:border-gray-600">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="p-1 rounded-md flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => oncheckall && oncheckall(sortedValues)}
        disabled={sortedValues.length === 0}
        aria-label="Check all"
        title="Check all"
      >
        <svg
          class="w-4 h-4 text-gray-800 dark:text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="2.5"
            fill="none"
          />
          <path
            d="M7 13l3 3 7-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
        <span class="text-sm text-gray-800 dark:text-gray-100 select-none">All</span>
      </button>
      <button
        type="button"
        class="p-1 rounded-md flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => oninvert && oninvert(sortedValues)}
        disabled={sortedValues.length === 0}
        aria-label="Invert selection"
        title="Invert selection"
      >
        <svg
          class="w-4 h-4 text-gray-800 dark:text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="2.5"
            fill="none"
          />
          <rect
            x="4"
            y="4"
            width="8.5"
            height="16"
            fill="currentColor"
            opacity="0.28"
            stroke="none"
          />
          <path
            d="M7 13l3 3 7-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
        <span class="text-sm text-gray-800 dark:text-gray-100 select-none">Invert</span>
      </button>
      <button
        type="button"
        class="p-1 rounded-md flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => onchecknone && onchecknone()}
        disabled={sortedValues.length === 0}
        aria-label="Uncheck all"
        title="Uncheck all"
      >
        <svg
          class="w-4 h-4 text-gray-800 dark:text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
        </svg>
        <span class="text-sm text-gray-800 dark:text-gray-100 select-none">None</span>
      </button>
    </div>
    <div class="pr-1">
      <span
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
        title="Total options">{sortedValues.length}</span
      >
    </div>
  </div>
</div>

<!-- Checkbox list -->
<div class="p-1 overflow-y-auto flex-1 max-h-48" bind:this={listRef} onscroll={handleScroll}>
  {#if sortedValues.length > populateThreshold && !loaded}
    <div class="p-1 text-sm text-gray-700 dark:text-gray-200">
      Too many options ({sortedValues.length}) to render by default.
      <button
        class="ml-2 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white border border-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500"
        type="button"
        onclick={() => (manuallyLoaded = true)}
      >
        Load options
      </button>
    </div>
  {:else if virtualSlice}
    <div style="height:{virtualSlice.totalHeight}px; position:relative;">
      <div style="position:absolute; top:{virtualSlice.top}px; left:0; right:0;">
        {#each virtualSlice.slice as value, idx (idx)}
          {@const isSelected = selections?.includes(value)}
          {@const displayValue = value === null || value === undefined ? '(empty)' : String(value)}
          <label
            class="flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            style="height:{virtualItemHeight}px; box-sizing:border-box;"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onchange={() => ontoggle && ontoggle(value)}
              class="w-4 h-4 shrink-0 cursor-pointer accent-blue-500"
            />
            <span
              class="flex-1 text-sm text-gray-700 dark:text-gray-300 select-none min-w-0 overflow-hidden text-ellipsis"
              >{displayValue}</span
            >
            {#if showCounts && column.counts && column.counts[value] !== undefined}
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto shrink-0"
                >({column.counts[value]})</span
              >
            {/if}
          </label>
        {/each}
      </div>
    </div>
  {:else if sortedValues.length > 0}
    {#each sortedValues as value, idx (idx)}
      {@const isSelected = selections?.includes(value)}
      {@const displayValue = value === null || value === undefined ? '(empty)' : String(value)}
      <label
        class="flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onchange={() => ontoggle && ontoggle(value)}
          class="w-4 h-4 shrink-0 cursor-pointer accent-blue-500"
        />
        <span
          class="flex-1 text-sm text-gray-700 dark:text-gray-300 select-none min-w-0 overflow-hidden text-ellipsis"
          >{displayValue}</span
        >
        {#if showCounts && column.counts && column.counts[value] !== undefined}
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto shrink-0"
            >({column.counts[value]})</span
          >
        {/if}
      </label>
    {/each}
  {:else}
    <div class="p-4 text-center text-sm text-gray-400 dark:text-gray-500">No values available</div>
  {/if}
</div>
