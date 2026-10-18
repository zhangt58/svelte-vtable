import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sortItems,
  getExportColumns,
  getExportValue,
  escapeCSVValue,
  toCSV,
  downloadCSV,
  exportCSV,
} from '../src/lib/exportUtils.js';

const rows = [
  { id: 2, name: 'Bob', tags: ['a', 'b'] },
  { id: 10, name: 'alice', tags: [] },
  { id: 1, name: null, tags: ['c'] },
];

// ---------------------------------------------------------------------------
// sortItems
// ---------------------------------------------------------------------------
describe('sortItems', () => {
  it('sorts naturally and case-insensitively', () => {
    expect(sortItems(rows, 'id').map((r) => r.id)).toEqual([1, 2, 10]);
    expect(sortItems(rows, 'name').map((r) => r.name)).toEqual(['alice', 'Bob', null]);
  });

  it('keeps empty values last when descending', () => {
    expect(sortItems(rows, 'name', 'desc').map((r) => r.name)).toEqual(['Bob', 'alice', null]);
  });

  it('returns a copy and keeps the order without a key', () => {
    const out = sortItems(rows, null);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
    expect(sortItems(undefined, 'id')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// column helpers
// ---------------------------------------------------------------------------
describe('export column helpers', () => {
  it('drops columns with exportable: false', () => {
    const cols = [{ key: 'id' }, { key: 'actions', exportable: false }, null];
    expect(getExportColumns(cols).map((c) => c.key)).toEqual(['id']);
    expect(getExportColumns(undefined)).toEqual([]);
  });

  it('uses exportValue when given', () => {
    const col = { key: 'id', exportValue: (item, value) => `#${value}-${item.name}` };
    expect(getExportValue(rows[0], col)).toBe('#2-Bob');
    expect(getExportValue(rows[0], { key: 'name' })).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// escapeCSVValue
// ---------------------------------------------------------------------------
describe('escapeCSVValue', () => {
  it('leaves plain text alone', () => {
    expect(escapeCSVValue('plain')).toBe('plain');
    expect(escapeCSVValue(42)).toBe('42');
  });

  it('quotes delimiters, quotes, line breaks and edge spaces', () => {
    expect(escapeCSVValue('a,b')).toBe('"a,b"');
    expect(escapeCSVValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCSVValue(' padded')).toBe('" padded"');
    expect(escapeCSVValue('a;b', { delimiter: ';' })).toBe('"a;b"');
    expect(escapeCSVValue('a,b', { delimiter: ';' })).toBe('a,b');
  });

  it('stringifies empty values, dates, arrays and objects', () => {
    expect(escapeCSVValue(null)).toBe('');
    expect(escapeCSVValue(undefined)).toBe('');
    expect(escapeCSVValue(new Date('2024-01-02T03:04:05Z'))).toBe('2024-01-02T03:04:05.000Z');
    expect(escapeCSVValue(['x', 'y'])).toBe('x; y');
    expect(escapeCSVValue({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('neutralizes text that a spreadsheet would run as a formula', () => {
    expect(escapeCSVValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCSVValue('@cmd')).toBe("'@cmd");
    expect(escapeCSVValue('+1')).toBe("'+1");
    expect(escapeCSVValue(-5)).toBe('-5');
    expect(escapeCSVValue('=1', { escapeFormulas: false })).toBe('=1');
  });
});

// ---------------------------------------------------------------------------
// toCSV
// ---------------------------------------------------------------------------
describe('toCSV', () => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', exportLabel: 'Full name' },
    { key: 'tags' },
    { key: 'actions', label: '', exportable: false },
  ];

  it('writes a header and one line per row, in the given order', () => {
    expect(toCSV(rows, columns)).toBe(
      ['ID,Full name,tags', '2,Bob,a; b', '10,alice,', '1,,c'].join('\r\n'),
    );
  });

  it('supports another delimiter, line ending and no header', () => {
    expect(toCSV(rows.slice(0, 1), columns, { delimiter: '\t', header: false })).toBe(
      '2\tBob\ta; b',
    );
    expect(toCSV(rows.slice(0, 2), columns, { lineEnding: '\n', header: false })).toBe(
      '2,Bob,a; b\n10,alice,',
    );
  });

  it('writes only the header for no rows', () => {
    expect(toCSV([], columns)).toBe('ID,Full name,tags');
  });
});

// ---------------------------------------------------------------------------
// downloadCSV / exportCSV (with a minimal DOM stand-in)
// ---------------------------------------------------------------------------
describe('downloadCSV / exportCSV', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubDom() {
    const link = { click: vi.fn(), remove: vi.fn(), style: {} };
    const blobs = [];
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob) => {
        blobs.push(blob);
        return 'blob:test';
      }),
      revokeObjectURL: vi.fn(),
    });
    return { link, blobs };
  }

  it('saves the CSV with a BOM under the given file name', async () => {
    vi.useFakeTimers();
    const { link, blobs } = stubDom();
    downloadCSV('a,b', 'view.csv');
    expect(link.download).toBe('view.csv');
    expect(link.href).toBe('blob:test');
    expect(link.click).toHaveBeenCalledOnce();
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
    // Blob.text() strips a leading BOM, so check the bytes.
    expect([...new Uint8Array(await blobs[0].arrayBuffer())]).toEqual([
      0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62,
    ]);
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('can leave out the BOM', async () => {
    const { blobs } = stubDom();
    downloadCSV('a,b', 'view.csv', { bom: false });
    expect([...new Uint8Array(await blobs[0].arrayBuffer())]).toEqual([0x61, 0x2c, 0x62]);
  });

  it('exportCSV builds, saves and returns the CSV', () => {
    const { link } = stubDom();
    const csv = exportCSV(rows.slice(0, 1), [{ key: 'id', label: 'ID' }], { filename: 'x.csv' });
    expect(csv).toBe('ID\r\n2');
    expect(link.download).toBe('x.csv');
  });

  it('downloadCSV throws without a document', () => {
    expect(() => downloadCSV('a')).toThrow(/browser document/);
  });
});
