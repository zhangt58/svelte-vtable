<script>
  /**
   * Renders a date/datetime range picker for a single filter column, including:
   *   - From / To date inputs with "Earliest" / "Latest" shortcuts
   *   - Dual-range slider (when column provides minValue / maxValue)
   *   - Relative-range quick preset buttons
   *   - Clear button
   *
   * Props:
   *   column               — column config { key, label, type, minValue, maxValue }
   *   selection            — current range selection { from?: string, to?: string }
   *   relativeRangePresets — array of { label, value, unit } presets
   *   onchange             — callback({ from?, to? }) called with the updated selection
   *   onclear              — callback() when the clear button is clicked
   */
  let { column, selection = {}, relativeRangePresets = [], onchange, onclear } = $props();

  const inputType = $derived(column.type === 'datetimerange' ? 'datetime-local' : 'date');

  const applicablePresets = $derived(
    relativeRangePresets.filter((p) => p.unit !== 'hour' || column.type === 'datetimerange'),
  );

  // Parse a filter date string to ms timestamp (consistent with filterUtils.matchesDateRange)
  function parseFilterDate(str) {
    if (!str) return NaN;
    return /^\d{4}-\d{2}-\d{2}$/.test(str)
      ? new Date(str + 'T00:00:00').getTime()
      : new Date(str).getTime();
  }

  function formatAsInputValue(ms, type) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (type === 'datetime-local') {
      return `${dateStr}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return dateStr;
  }

  const minMs = $derived(parseFilterDate(column.minValue));
  const maxMs = $derived(parseFilterDate(column.maxValue));
  const totalMs = $derived(maxMs - minMs);
  const fromMs = $derived(parseFilterDate(selection.from));
  const toMs = $derived(parseFilterDate(selection.to));

  const fromPct = $derived(
    totalMs > 0 && !isNaN(fromMs)
      ? Math.max(0, Math.min(100, ((fromMs - minMs) / totalMs) * 100))
      : 0,
  );
  const toPct = $derived(
    totalMs > 0 && !isNaN(toMs)
      ? Math.max(0, Math.min(100, ((toMs - minMs) / totalMs) * 100))
      : 100,
  );

  function handleFieldInput(field, value) {
    if (onchange) onchange({ ...selection, [field]: value });
  }

  function handleFromSlider(pct) {
    let newFromMs = minMs + (pct / 100) * (maxMs - minMs);
    if (!isNaN(toMs) && newFromMs > toMs) newFromMs = toMs;
    if (onchange) onchange({ ...selection, from: formatAsInputValue(newFromMs, inputType) });
  }

  function handleToSlider(pct) {
    let newToMs = minMs + (pct / 100) * (maxMs - minMs);
    if (!isNaN(fromMs) && newToMs < fromMs) newToMs = fromMs;
    if (onchange) onchange({ ...selection, to: formatAsInputValue(newToMs, inputType) });
  }

  function setRelativeRange(value, unit) {
    const now = new Date();
    const from = new Date(now);
    switch (unit) {
      case 'hour':
        from.setHours(from.getHours() - value);
        break;
      case 'day':
        from.setDate(from.getDate() - value);
        break;
      case 'week':
        from.setDate(from.getDate() - value * 7);
        break;
      case 'month':
        from.setMonth(from.getMonth() - value);
        break;
      case 'year':
        from.setFullYear(from.getFullYear() - value);
        break;
    }
    if (onchange) {
      onchange({
        from: formatAsInputValue(from.getTime(), inputType),
        to: formatAsInputValue(now.getTime(), inputType),
      });
    }
  }
</script>

<div class="p-3 flex flex-col gap-2">
  <!-- From input + Earliest shortcut -->
  <div class="flex items-center gap-2">
    <label
      class="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 shrink-0"
      for="filter-{column.key}-from"
    >
      From
    </label>
    <input
      id="filter-{column.key}-from"
      type={inputType}
      class="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
      value={selection.from || ''}
      oninput={(e) => handleFieldInput('from', e.currentTarget.value)}
    />
    {#if column.minValue}
      <button
        type="button"
        class="shrink-0 px-2 py-0.5 text-xs rounded border border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center"
        title="Set From to the earliest record ({column.minValue})"
        aria-label="Set From to the earliest record"
        onclick={() => handleFieldInput('from', column.minValue)}
      >
        <svg
          class="w-4 h-4 text-indigo-700 dark:text-indigo-300"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M11.5 7.5L7 12l4.5 4.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <path
            d="M17.5 7.5L13 12l4.5 4.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </button>
    {/if}
  </div>

  <!-- To input + Latest shortcut -->
  <div class="flex items-center gap-2">
    <label
      class="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 shrink-0"
      for="filter-{column.key}-to"
    >
      To
    </label>
    <input
      id="filter-{column.key}-to"
      type={inputType}
      class="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
      value={selection.to || ''}
      oninput={(e) => handleFieldInput('to', e.currentTarget.value)}
    />
    {#if column.maxValue}
      <button
        type="button"
        class="shrink-0 px-2 py-0.5 text-xs rounded border border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center"
        title="Set To to the latest record ({column.maxValue})"
        aria-label="Set To to the latest record"
        onclick={() => handleFieldInput('to', column.maxValue)}
      >
        <svg
          class="w-4 h-4 text-indigo-700 dark:text-indigo-300"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12.5 7.5L17 12l-4.5 4.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <path
            d="M6.5 7.5L11 12l-4.5 4.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Dual-range slider (only when column provides min/max) -->
  {#if column.minValue && column.maxValue && totalMs > 0}
    <div class="dual-range-wrapper" aria-label="Date range slider">
      <div class="dual-range-track-bg"></div>
      <div class="dual-range-track-fill" style="left:{fromPct}%; right:{100 - toPct}%"></div>
      <input
        type="range"
        class="dual-range-input"
        min="0"
        max="100"
        step="0.02"
        value={fromPct}
        style="z-index:{fromPct >= toPct - 2 ? 4 : 3}"
        oninput={(e) => handleFromSlider(parseFloat(e.currentTarget.value))}
        aria-label="Range start"
      />
      <input
        type="range"
        class="dual-range-input"
        min="0"
        max="100"
        step="0.02"
        value={toPct}
        style="z-index:{fromPct >= toPct - 2 ? 3 : 4}"
        oninput={(e) => handleToSlider(parseFloat(e.currentTarget.value))}
        aria-label="Range end"
      />
    </div>
  {/if}

  <!-- Relative-range quick buttons -->
  {#if applicablePresets.length > 0}
    <div class="flex flex-wrap gap-1 pt-1 border-t border-gray-100 dark:border-gray-600">
      {#each applicablePresets as preset (preset.label)}
        <button
          type="button"
          class="px-2 py-0.5 text-xs rounded border border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Last {preset.value} {preset.unit}{preset.value !== 1 ? 's' : ''}"
          onclick={() => setRelativeRange(preset.value, preset.unit)}
        >
          Last {preset.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if selection.from || selection.to}
    <button
      type="button"
      class="self-start px-2 py-0.5 text-xs text-red-600 border border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      onclick={() => onclear && onclear()}
    >
      Clear range
    </button>
  {/if}
</div>

<style>
  .dual-range-wrapper {
    position: relative;
    height: 20px;
    display: flex;
    align-items: center;
    margin: 4px 0;
  }

  .dual-range-track-bg {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 2px;
    background: #d1d5db;
  }

  :global(.dark) .dual-range-track-bg {
    background: #4b5563;
  }

  .dual-range-track-fill {
    position: absolute;
    height: 4px;
    border-radius: 2px;
    background: var(--vtable-color-info);
    pointer-events: none;
  }

  .dual-range-input {
    position: absolute;
    left: 0;
    width: 100%;
    height: 4px;
    background: none;
    pointer-events: none;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    margin: 0;
    padding: 0;
  }

  .dual-range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    pointer-events: all;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--vtable-color-info);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px var(--vtable-color-info);
    transition: background 0.15s;
  }

  .dual-range-input::-webkit-slider-thumb:hover {
    background: var(--vtable-color-info);
    filter: brightness(0.85);
  }

  .dual-range-input::-moz-range-thumb {
    pointer-events: all;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--vtable-color-info);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px var(--vtable-color-info);
    transition: background 0.15s;
  }

  .dual-range-input::-moz-range-thumb:hover {
    background: var(--vtable-color-info);
    filter: brightness(0.85);
  }
</style>
