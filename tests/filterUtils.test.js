import { describe, it, expect } from 'vitest';
import {
  getUniqueValuesWithCounts,
  buildColumnFilters,
  matchesDateRange,
  applyFilters,
  hasActiveFilters,
  countActiveFilters,
  clearAllFilters,
  filtersToSearchParams,
  searchParamsToFilters,
} from '../src/lib/filterUtils.js';

// ---------------------------------------------------------------------------
// getUniqueValuesWithCounts
// ---------------------------------------------------------------------------
describe('getUniqueValuesWithCounts', () => {
  it('returns empty uniqueValues and counts for an empty array', () => {
    const result = getUniqueValuesWithCounts([], 'name');
    expect(result.uniqueValues).toEqual([]);
    expect(result.counts).toEqual({});
  });

  it('counts occurrences of each unique value', () => {
    const data = [{ status: 'a' }, { status: 'b' }, { status: 'a' }];
    const { uniqueValues, counts } = getUniqueValuesWithCounts(data, 'status');
    expect(counts['a']).toBe(2);
    expect(counts['b']).toBe(1);
    expect(uniqueValues).toContain('a');
    expect(uniqueValues).toContain('b');
  });

  it('normalizes null and undefined values to "(empty)"', () => {
    const data = [{ val: null }, { val: undefined }, { val: 'x' }];
    const { uniqueValues, counts } = getUniqueValuesWithCounts(data, 'val');
    expect(counts['(empty)']).toBe(2);
    expect(counts['x']).toBe(1);
    expect(uniqueValues).toContain('(empty)');
  });

  it('handles a single item', () => {
    const { uniqueValues, counts } = getUniqueValuesWithCounts([{ k: 'only' }], 'k');
    expect(uniqueValues).toEqual(['only']);
    expect(counts['only']).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildColumnFilters
// ---------------------------------------------------------------------------
describe('buildColumnFilters', () => {
  const data = [
    { name: 'Alice', ts: '2024-01-01T08:00:00', day: '2024-01-01' },
    { name: 'Bob', ts: '2024-06-15T12:30:00', day: '2024-06-15' },
    { name: 'Alice', ts: null, day: null },
  ];

  it('returns value-type column filters with uniqueValues and counts', () => {
    const columns = [{ key: 'name', label: 'Name', filterType: 'value' }];
    const [col] = buildColumnFilters(data, columns);
    expect(col.key).toBe('name');
    expect(col.type).toBe('value');
    expect(col.uniqueValues).toContain('Alice');
    expect(col.uniqueValues).toContain('Bob');
    expect(col.counts['Alice']).toBe(2);
  });

  it('excludes columns with filterType "none"', () => {
    const columns = [
      { key: 'name', filterType: 'none' },
      { key: 'day', filterType: 'value' },
    ];
    const result = buildColumnFilters(data, columns);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('day');
  });

  it('builds a daterange column with minValue and maxValue', () => {
    const columns = [{ key: 'day', label: 'Day', filterType: 'daterange' }];
    const [col] = buildColumnFilters(data, columns);
    expect(col.type).toBe('daterange');
    expect(col.minValue).toBe('2024-01-01');
    expect(col.maxValue).toBe('2024-06-15');
  });

  it('builds a datetimerange column with minValue and maxValue', () => {
    const columns = [{ key: 'ts', label: 'Timestamp', filterType: 'datetimerange' }];
    const [col] = buildColumnFilters(data, columns);
    expect(col.type).toBe('datetimerange');
    expect(col.minValue).toBe('2024-01-01T08:00');
    expect(col.maxValue).toBe('2024-06-15T12:30');
  });

  it('sets minValue/maxValue to null when all date values are missing', () => {
    const columns = [{ key: 'ts', filterType: 'daterange' }];
    const [col] = buildColumnFilters([{ ts: null }, { ts: '' }], columns);
    expect(col.minValue).toBeNull();
    expect(col.maxValue).toBeNull();
  });

  it('uses col.key as label when col.label is absent', () => {
    const columns = [{ key: 'name', filterType: 'value' }];
    const [col] = buildColumnFilters(data, columns);
    expect(col.label).toBe('name');
  });

  it('defaults to type "value" when filterType is undefined', () => {
    const columns = [{ key: 'name' }];
    const [col] = buildColumnFilters(data, columns);
    expect(col.type).toBe('value');
  });
});

// ---------------------------------------------------------------------------
// matchesDateRange
// ---------------------------------------------------------------------------
describe('matchesDateRange', () => {
  it('returns false for null value', () => {
    expect(matchesDateRange(null, '2024-01-01', '2024-12-31')).toBe(false);
  });

  it('returns false for undefined value', () => {
    expect(matchesDateRange(undefined, '2024-01-01', null)).toBe(false);
  });

  it('returns false for empty string value', () => {
    expect(matchesDateRange('', null, '2024-12-31')).toBe(false);
  });

  it('returns false for an unparseable date string', () => {
    expect(matchesDateRange('not-a-date', null, null)).toBe(false);
  });

  it('returns true when no bounds are given (valid date)', () => {
    expect(matchesDateRange('2024-03-15', null, null)).toBe(true);
  });

  it('returns true when only `from` is given and value is on the boundary', () => {
    expect(matchesDateRange('2024-03-15', '2024-03-15', null)).toBe(true);
  });

  it('returns false when value is before `from`', () => {
    expect(matchesDateRange('2024-01-01', '2024-06-01', null)).toBe(false);
  });

  it('returns true when only `to` is given and value is on the boundary', () => {
    expect(matchesDateRange('2024-12-31', null, '2024-12-31')).toBe(true);
  });

  it('returns false when value is after `to`', () => {
    expect(matchesDateRange('2025-01-01', null, '2024-12-31')).toBe(false);
  });

  it('returns true when value is within both bounds', () => {
    expect(matchesDateRange('2024-06-15', '2024-01-01', '2024-12-31')).toBe(true);
  });

  it('date-only `to` is inclusive through end of that day (23:59:59.999)', () => {
    // A datetime value at the very end of the "to" date should match
    expect(matchesDateRange('2024-03-15T23:59:59', '2024-03-01', '2024-03-15')).toBe(true);
  });

  it('datetime value just after end of date-only `to` day is excluded', () => {
    // The next calendar day is outside the range
    expect(matchesDateRange('2024-03-16T00:00:00', '2024-03-01', '2024-03-15')).toBe(false);
  });

  it('accepts a Date object as value', () => {
    expect(matchesDateRange(new Date('2024-06-15T00:00:00'), '2024-01-01', '2024-12-31')).toBe(
      true,
    );
  });

  it('handles datetime-local strings in from/to', () => {
    expect(matchesDateRange('2024-06-15T10:00:00', '2024-06-15T09:00', '2024-06-15T11:00')).toBe(
      true,
    );
    expect(matchesDateRange('2024-06-15T08:00:00', '2024-06-15T09:00', '2024-06-15T11:00')).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------
describe('applyFilters', () => {
  const data = [
    { name: 'Alice', city: 'NYC', date: '2024-01-10' },
    { name: 'Bob', city: 'LA', date: '2024-05-20' },
    { name: 'Charlie', city: 'NYC', date: '2024-09-01' },
    { name: null, city: 'NYC', date: '2024-03-01' },
  ];

  it('returns all data when activeFilters is empty', () => {
    expect(applyFilters(data, {})).toHaveLength(4);
  });

  it('returns all data when activeFilters is null', () => {
    expect(applyFilters(data, null)).toHaveLength(4);
  });

  it('filters by a single value column', () => {
    const result = applyFilters(data, { city: ['NYC'] });
    expect(result).toHaveLength(3);
    result.forEach((r) => expect(r.city).toBe('NYC'));
  });

  it('applies AND logic across multiple columns', () => {
    const result = applyFilters(data, { name: ['Alice'], city: ['NYC'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('applies OR logic within a column', () => {
    const result = applyFilters(data, { name: ['Alice', 'Bob'] });
    expect(result).toHaveLength(2);
  });

  it('skips filter when its array is empty', () => {
    const result = applyFilters(data, { name: [], city: ['LA'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob');
  });

  it('matches null item values via "(empty)" sentinel', () => {
    const result = applyFilters(data, { name: ['(empty)'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBeNull();
  });

  it('filters by date range', () => {
    const result = applyFilters(data, { date: { from: '2024-04-01', to: '2024-12-31' } });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('Bob');
    expect(result.map((r) => r.name)).toContain('Charlie');
  });

  it('skips a date range filter when both from and to are absent', () => {
    const result = applyFilters(data, { date: {} });
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// hasActiveFilters
// ---------------------------------------------------------------------------
describe('hasActiveFilters', () => {
  it('returns false for an all-empty object', () => {
    expect(hasActiveFilters({ name: [], date: {} })).toBe(false);
  });

  it('returns true when an array filter has at least one value', () => {
    expect(hasActiveFilters({ name: ['Alice'], date: {} })).toBe(true);
  });

  it('returns true when a date range has a `from` value', () => {
    expect(hasActiveFilters({ name: [], date: { from: '2024-01-01' } })).toBe(true);
  });

  it('returns true when a date range has a `to` value', () => {
    expect(hasActiveFilters({ name: [], date: { to: '2024-12-31' } })).toBe(true);
  });

  it('returns false for an object with only empty arrays and empty date objects', () => {
    expect(hasActiveFilters({ a: [], b: [], c: {} })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countActiveFilters
// ---------------------------------------------------------------------------
describe('countActiveFilters', () => {
  it('returns 0 when nothing is active', () => {
    expect(countActiveFilters({ name: [], date: {} })).toBe(0);
  });

  it('counts individual array selections', () => {
    expect(countActiveFilters({ name: ['Alice', 'Bob'], city: ['NYC'] })).toBe(3);
  });

  it('counts an active date range as 1', () => {
    expect(countActiveFilters({ date: { from: '2024-01-01', to: '2024-12-31' } })).toBe(1);
  });

  it('counts mixed value + date filters correctly', () => {
    expect(
      countActiveFilters({
        name: ['Alice', 'Bob'],
        city: [],
        date: { from: '2024-01-01' },
      }),
    ).toBe(3);
  });

  it('counts a date range with only `to` as 1', () => {
    expect(countActiveFilters({ date: { to: '2024-12-31' } })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// clearAllFilters
// ---------------------------------------------------------------------------
describe('clearAllFilters', () => {
  it('resets value columns to empty arrays', () => {
    const columnFilters = [{ key: 'name', type: 'value' }];
    const result = clearAllFilters(columnFilters);
    expect(result.name).toEqual([]);
  });

  it('resets daterange columns to empty objects', () => {
    const columnFilters = [{ key: 'date', type: 'daterange' }];
    const result = clearAllFilters(columnFilters);
    expect(result.date).toEqual({});
  });

  it('resets datetimerange columns to empty objects', () => {
    const columnFilters = [{ key: 'ts', type: 'datetimerange' }];
    const result = clearAllFilters(columnFilters);
    expect(result.ts).toEqual({});
  });

  it('handles mixed column types', () => {
    const columnFilters = [
      { key: 'name', type: 'value' },
      { key: 'date', type: 'daterange' },
      { key: 'ts', type: 'datetimerange' },
    ];
    const result = clearAllFilters(columnFilters);
    expect(result.name).toEqual([]);
    expect(result.date).toEqual({});
    expect(result.ts).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// filtersToSearchParams
// ---------------------------------------------------------------------------
describe('filtersToSearchParams', () => {
  it('serializes value filters as comma-separated param', () => {
    const params = filtersToSearchParams({ name: ['Alice', 'Bob'] });
    expect(params.get('name')).toBe('Alice,Bob');
  });

  it('omits empty array filters', () => {
    const params = filtersToSearchParams({ name: [] });
    expect(params.has('name')).toBe(false);
  });

  it('serializes date range as _from / _to params', () => {
    const params = filtersToSearchParams({ date: { from: '2024-01-01', to: '2024-12-31' } });
    expect(params.get('date_from')).toBe('2024-01-01');
    expect(params.get('date_to')).toBe('2024-12-31');
  });

  it('omits missing half of a date range', () => {
    const params = filtersToSearchParams({ date: { from: '2024-01-01' } });
    expect(params.get('date_from')).toBe('2024-01-01');
    expect(params.has('date_to')).toBe(false);
  });

  it('omits empty date range objects', () => {
    const params = filtersToSearchParams({ date: {} });
    expect(params.has('date_from')).toBe(false);
    expect(params.has('date_to')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// searchParamsToFilters
// ---------------------------------------------------------------------------
describe('searchParamsToFilters', () => {
  const columnFilters = [
    { key: 'name', type: 'value' },
    { key: 'city', type: 'value' },
    { key: 'date', type: 'daterange' },
  ];

  it('parses value params back to string arrays', () => {
    const params = new URLSearchParams('name=Alice%2CBob');
    const filters = searchParamsToFilters(params, columnFilters);
    expect(filters.name).toEqual(['Alice', 'Bob']);
  });

  it('parses date range _from / _to params', () => {
    const params = new URLSearchParams('date_from=2024-01-01&date_to=2024-12-31');
    const filters = searchParamsToFilters(params, columnFilters);
    expect(filters.date).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });

  it('ignores unknown keys', () => {
    const params = new URLSearchParams('unknown=foo&name=Alice');
    const filters = searchParamsToFilters(params, columnFilters);
    expect(filters.unknown).toBeUndefined();
    expect(filters.name).toEqual(['Alice']);
  });

  it('accepts a raw query string instead of URLSearchParams', () => {
    const filters = searchParamsToFilters('city=LA', columnFilters);
    expect(filters.city).toEqual(['LA']);
  });

  it('round-trips through filtersToSearchParams → searchParamsToFilters', () => {
    const original = {
      name: ['Alice', 'Bob'],
      date: { from: '2024-01-01', to: '2024-12-31' },
    };
    const params = filtersToSearchParams(original);
    const restored = searchParamsToFilters(params, columnFilters);
    expect(restored.name).toEqual(['Alice', 'Bob']);
    expect(restored.date).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });

  it('does not parse a value key as a date range', () => {
    // "name_from" is not a valid date-range param because "name" is type "value"
    const params = new URLSearchParams('name_from=2024-01-01');
    const filters = searchParamsToFilters(params, columnFilters);
    expect(filters.name).toBeUndefined();
  });
});
