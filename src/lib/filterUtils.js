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
 * @param {Array} columns - Array of column definitions {key, label}
 * @returns {Array} Column filters configuration for DataTableFilters
 */
export function buildColumnFilters(data, columns) {
  return columns.map((col) => {
    const { uniqueValues, counts } = getUniqueValuesWithCounts(data, col.key);
    return {
      key: col.key,
      label: col.label || col.key,
      uniqueValues,
      counts,
    };
  });
}

/**
 * Apply filters to data with OR logic within columns and AND logic across columns
 * @param {Array} data - Array of data objects to filter
 * @param {Object} activeFilters - Active filters object { columnKey: [selectedValues] }
 * @returns {Array} Filtered data array
 */
export function applyFilters(data, activeFilters) {
  if (!activeFilters || Object.keys(activeFilters).length === 0) {
    return data;
  }

  return data.filter((item) => {
    // Check each column filter (AND logic across columns)
    for (const [columnKey, selectedValues] of Object.entries(activeFilters)) {
      // Skip if no values selected for this column
      if (!selectedValues || selectedValues.length === 0) continue;

      // Get the item's value for this column
      const itemValue = item[columnKey];
      const normalizedItemValue = itemValue ?? '(empty)';

      // Check if item value matches any selected value (OR logic within column)
      if (!selectedValues.includes(normalizedItemValue)) {
        return false; // Item doesn't match this column filter
      }
    }
    return true; // Item matches all column filters
  });
}

/**
 * Check if any filters are currently active
 * @param {Object} activeFilters - Active filters object { columnKey: [selectedValues] }
 * @returns {boolean} True if any filters are active
 */
export function hasActiveFilters(activeFilters) {
  return Object.values(activeFilters).some((arr) => arr && arr.length > 0);
}

/**
 * Count total number of active filter selections
 * @param {Object} activeFilters - Active filters object { columnKey: [selectedValues] }
 * @returns {number} Total count of selected filter values
 */
export function countActiveFilters(activeFilters) {
  return Object.values(activeFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0);
}

/**
 * Clear all filters
 * @param {Array} columnFilters - Column filters configuration
 * @returns {Object} Empty filters object
 */
export function clearAllFilters(columnFilters) {
  const cleared = {};
  columnFilters.forEach((col) => {
    cleared[col.key] = [];
  });
  return cleared;
}

/**
 * Export active filters as URL search params
 * @param {Object} activeFilters - Active filters object
 * @returns {URLSearchParams} URL search params object
 */
export function filtersToSearchParams(activeFilters) {
  const params = new URLSearchParams();

  for (const [key, values] of Object.entries(activeFilters)) {
    if (values && values.length > 0) {
      params.set(key, values.join(','));
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
  const filters = {};

  for (const [key, value] of params.entries()) {
    if (validKeys.has(key) && value) {
      filters[key] = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  return filters;
}
