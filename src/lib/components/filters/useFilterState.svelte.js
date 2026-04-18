import { onDestroy } from 'svelte';

function isDateRangeColumn(col) {
  return col.type === 'daterange' || col.type === 'datetimerange';
}

/**
 * Svelte 5 reactive composable that manages per-column filter selections,
 * debounced emission, and selection helpers.
 *
 * @param {object} opts
 * @param {() => Array} opts.columnFilters - reactive getter for column filter configs
 * @param {() => object} opts.activeFilters - reactive getter for active filters
 * @param {() => number} opts.emitDebounce - reactive getter for debounce ms
 * @param {() => Function|undefined} opts.onfilter - reactive getter for onfilter callback
 */
export function useFilterState(opts) {
  let selections = $state({});
  let _emitTimer = null;
  let _pendingEmit = null;

  // Sync selections from activeFilters whenever columnFilters or activeFilters change
  $effect(() => {
    const cols = opts.columnFilters();
    const active = opts.activeFilters();
    const newSelections = {};
    for (const col of cols) {
      newSelections[col.key] = active[col.key] ?? (isDateRangeColumn(col) ? {} : []);
    }
    selections = newSelections;
  });

  function scheduleEmit(columnKey, selectedValues) {
    _pendingEmit = { columnKey, selectedValues, allFilters: selections };
    const delay = opts.emitDebounce();
    if (!delay || delay <= 0) {
      flushEmit();
      return;
    }
    if (_emitTimer) clearTimeout(_emitTimer);
    _emitTimer = setTimeout(() => flushEmit(), delay);
  }

  function flushEmit() {
    if (!_pendingEmit) return;
    const payload = _pendingEmit;
    _pendingEmit = null;
    if (_emitTimer) {
      clearTimeout(_emitTimer);
      _emitTimer = null;
    }
    const handler = opts.onfilter();
    if (handler !== undefined) {
      try {
        handler({
          key: payload.columnKey,
          values: payload.selectedValues,
          allFilters: payload.allFilters,
        });
      } catch (err) {
        try {
          console.error('onfilter threw:', err);
        } catch (e) {}
      }
    }
  }

  onDestroy(() => {
    if (_emitTimer) clearTimeout(_emitTimer);
    flushEmit();
  });

  function toggleSelection(columnKey, value) {
    const current = selections[columnKey] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    selections = { ...selections, [columnKey]: updated };
    scheduleEmit(columnKey, updated);
  }

  function clearColumn(columnKey) {
    const col = opts.columnFilters().find((c) => c.key === columnKey);
    const empty = isDateRangeColumn(col) ? {} : [];
    selections = { ...selections, [columnKey]: empty };
    scheduleEmit(columnKey, empty);
  }

  function clearAllFilters() {
    const cleared = {};
    for (const col of opts.columnFilters()) {
      cleared[col.key] = isDateRangeColumn(col) ? {} : [];
    }
    selections = cleared;
    scheduleEmit(null, []);
  }

  function checkAll(columnKey, values) {
    const all = Array.isArray(values) ? values.slice() : [];
    selections = { ...selections, [columnKey]: all };
    scheduleEmit(columnKey, all);
  }

  function invertSelection(columnKey, values) {
    const current = new Set(selections[columnKey] || []);
    const next = (Array.isArray(values) ? values : []).filter((v) => !current.has(v));
    selections = { ...selections, [columnKey]: next };
    scheduleEmit(columnKey, next);
  }

  function checkNone(columnKey) {
    clearColumn(columnKey);
  }

  function updateDateRange(columnKey, updated) {
    selections = { ...selections, [columnKey]: updated };
    scheduleEmit(columnKey, updated);
  }

  return {
    get selections() {
      return selections;
    },
    toggleSelection,
    clearColumn,
    clearAllFilters,
    checkAll,
    invertSelection,
    checkNone,
    updateDateRange,
  };
}
