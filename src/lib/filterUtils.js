/**
 * Utility functions for working with DataTableFilters
 */

/**
 * Extract unique values and their counts from an array of objects for a given key
 * @param {Array} data - Array of data objects
 * @param {string} key - The property key to extract unique values from
 * @returns {{uniqueValues: Array, counts: Object}} Object with unique values array and counts map
 */
export function getUniqueValuesWithCounts(data, key) {
  const countMap = {};

  data.forEach((item) => {
    const value = item[key];
    // Handle null/undefined
    const normalizedValue = value ?? '(empty)';
    countMap[normalizedValue] = (countMap[normalizedValue] || 0) + 1;
  });

  return {
    uniqueValues: Object.keys(countMap),
    counts: countMap,
  };
}

/**
 * Build column filters configuration from data and column definitions
 * @param {Array} data - Array of data objects
 * @param {Array} columns - Array of column definitions {key, label, type?}
 *   Supported types: 'value' (default), 'daterange', 'datetimerange'
 * @returns {Array} Column filters configuration for DataTableFilters
 */
export function buildColumnFilters(data, columns) {
  return columns.map((col) => {
    const isDateRange = col.type === 'daterange' || col.type === 'datetimerange';
    if (isDateRange) {
      return {
        key: col.key,
        label: col.label || col.key,
        type: col.type,
        uniqueValues: [],
        counts: {},
      };
    }
    const { uniqueValues, counts } = getUniqueValuesWithCounts(data, col.key);
    return {
      key: col.key,
      label: col.label || col.key,
      type: col.type || 'value',
      uniqueValues,
      counts,
    };
  });
}

/**
 * Check whether a value falls within a date/datetime range.
 * Both `from` and `to` are optional; omitting one leaves that end open.
 * Date-only strings (YYYY-MM-DD) are parsed as **local** midnight (i.e. they
 * are treated as `<date>T00:00:00` in the local timezone, not UTC). A date-only
 * `to` value is inclusive through the end of that calendar day (23:59:59.999
 * local time).
 * @param {any} value - The item's date value (string, Date, or number)
 * @param {string|null|undefined} from - Range start (ISO date or datetime-local string)
 * @param {string|null|undefined} to - Range end (ISO date or datetime-local string)
 * @returns {boolean}
 */
export function matchesDateRange(value, from, to) {
  if (value === null || value === undefined || value === '') return false;

  // Parse the item date; treat date-only strings as local midnight
  let itemDate;
  if (value instanceof Date) {
    itemDate = value;
  } else {
    const str = String(value);
    itemDate = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(str + 'T00:00:00') : new Date(str);
  }
  if (isNaN(itemDate.getTime())) return false;

  if (from) {
    const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(from)
      ? new Date(from + 'T00:00:00')
      : new Date(from);
    if (!isNaN(fromDate.getTime()) && itemDate < fromDate) return false;
  }

  if (to) {
    // Extend date-only "to" to the end of that day so it is fully inclusive
    const toDate = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(to + 'T23:59:59.999') : new Date(to);
    if (!isNaN(toDate.getTime()) && itemDate > toDate) return false;
  }

  return true;
}

/**
 * Apply filters to data with OR logic within columns and AND logic across columns.
 * Supports both value-selection filters (array) and date/datetime range filters
 * (object with optional `from` and `to` string fields).
 * @param {Array} data - Array of data objects to filter
 * @param {Object} activeFilters - Active filters: { columnKey: string[] | {from?, to?} }
 * @returns {Array} Filtered data array
 */
export function applyFilters(data, activeFilters) {
  if (!activeFilters || Object.keys(activeFilters).length === 0) {
    return data;
  }

  return data.filter((item) => {
    // Check each column filter (AND logic across columns)
    for (const [columnKey, filterValue] of Object.entries(activeFilters)) {
      if (!filterValue) continue;

      if (Array.isArray(filterValue)) {
        // Value-based filter (OR logic within column)
        if (filterValue.length === 0) continue;
        const itemValue = item[columnKey];
        const normalizedItemValue = itemValue ?? '(empty)';
        if (!filterValue.includes(normalizedItemValue)) return false;
      } else if (typeof filterValue === 'object') {
        // Date / datetime range filter
        const { from, to } = filterValue;
        if (!from && !to) continue;
        if (!matchesDateRange(item[columnKey], from, to)) return false;
      }
    }
    return true; // Item matches all column filters
  });
}

/**
 * Check if any filters are currently active
 * @param {Object} activeFilters - Active filters object
 * @returns {boolean} True if any filters are active
 */
export function hasActiveFilters(activeFilters) {
  return Object.values(activeFilters).some((val) => {
    if (Array.isArray(val)) return val.length > 0;
    if (val && typeof val === 'object') return !!(val.from || val.to);
    return false;
  });
}

/**
 * Count total number of active filter selections.
 * Each active date range counts as 1.
 * @param {Object} activeFilters - Active filters object
 * @returns {number} Total count of active filter values/ranges
 */
export function countActiveFilters(activeFilters) {
  return Object.values(activeFilters).reduce((sum, val) => {
    if (Array.isArray(val)) return sum + (val?.length || 0);
    if (val && typeof val === 'object' && (val.from || val.to)) return sum + 1;
    return sum;
  }, 0);
}

/**
 * Clear all filters
 * @param {Array} columnFilters - Column filters configuration
 * @returns {Object} Cleared filters object (arrays for value columns, empty objects for date ranges)
 */
export function clearAllFilters(columnFilters) {
  const cleared = {};
  columnFilters.forEach((col) => {
    const isDateRange = col.type === 'daterange' || col.type === 'datetimerange';
    cleared[col.key] = isDateRange ? {} : [];
  });
  return cleared;
}

/**
 * Export active filters as URL search params.
 * Date range filters are serialised as `<key>_from` and `<key>_to` params.
 * @param {Object} activeFilters - Active filters object
 * @returns {URLSearchParams} URL search params object
 */
export function filtersToSearchParams(activeFilters) {
  const params = new URLSearchParams();

  for (const [key, values] of Object.entries(activeFilters)) {
    if (Array.isArray(values) && values.length > 0) {
      params.set(key, values.join(','));
    } else if (values && typeof values === 'object' && !Array.isArray(values)) {
      if (values.from) params.set(`${key}_from`, values.from);
      if (values.to) params.set(`${key}_to`, values.to);
    }
  }

  return params;
}

/**
 * Import active filters from URL search params
 * @param {URLSearchParams|string} searchParams - URL search params or query string
 * @param {Array} columnFilters - Column filters configuration (to validate keys)
 * @returns {Object} Active filters object
 */
export function searchParamsToFilters(searchParams, columnFilters) {
  const params =
    typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;

  const validKeys = new Set(columnFilters.map((c) => c.key));
  const dateRangeKeys = new Set(
    columnFilters
      .filter((c) => c.type === 'daterange' || c.type === 'datetimerange')
      .map((c) => c.key),
  );
  const filters = {};

  for (const [key, value] of params.entries()) {
    if (key.endsWith('_from') || key.endsWith('_to')) {
      const colKey = key.replace(/_from$|_to$/, '');
      if (validKeys.has(colKey) && dateRangeKeys.has(colKey)) {
        if (!filters[colKey]) filters[colKey] = {};
        if (key.endsWith('_from')) filters[colKey].from = value;
        else filters[colKey].to = value;
      }
    } else if (validKeys.has(key) && !dateRangeKeys.has(key) && value) {
      filters[key] = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  return filters;
}
