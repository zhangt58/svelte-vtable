// Sample dataset for the DataTableFilters demo

// Generate a larger sample dataset (1000 rows) deterministically using a simple LCG PRNG.
const firstNames = [
  'Alice',
  'Bob',
  'Carol',
  'David',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kelly',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Paul',
  'Quinn',
  'Rose',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xavier',
  'Yara',
  'Zane',
];
const lastNames = [
  'Johnson',
  'Smith',
  'Williams',
  'Brown',
  'Davis',
  'Miller',
  'Wilson',
  'Moore',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
  'Clark',
];
const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Support', 'Product', 'Finance'];
const statuses = ['Active', 'Inactive', 'On Leave'];
const levels = ['Junior', 'Mid', 'Senior', 'Lead'];

// Small linear congruential generator for deterministic pseudo-random numbers
function lcg(seed) {
  let state = seed >>> 0;
  return function () {
    // Constants from Numerical Recipes
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rand = lcg(42);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function makeName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

// Word bank for description generation (kept fairly small for determinism and readability)
const descWords = [
  'research',
  'development',
  'system',
  'analysis',
  'design',
  'implementation',
  'performance',
  'scalable',
  'robust',
  'user',
  'interface',
  'algorithm',
  'optimization',
  'prototype',
  'feature',
  'integration',
  'testing',
  'deployment',
  'cloud',
  'service',
  'database',
  'management',
  'security',
  'protocol',
  'model',
  'training',
  'evaluation',
  'experiment',
  'data',
  'visualization',
  'component',
  'module',
  'workflow',
  'automation',
  'script',
  'library',
  'package',
  'version',
  'support',
  'maintenance',
  'policy',
  'regression',
  'benchmark',
  'latency',
  'throughput',
  'cache',
  'index',
  'query',
  'pipeline',
  'stream',
];

// Create a deterministic description: mix of short and long descriptions
function makeDescription() {
  // Decide if we want a short or long description
  const p = rand();
  if (p < 0.15) {
    // long paragraph (80-160 words)
    const len = 80 + Math.floor(rand() * 81); // 80..160
    return randomWords(len);
  } else if (p < 0.5) {
    // medium sentence (20-50 words)
    const len = 20 + Math.floor(rand() * 31); // 20..50
    return randomWords(len);
  } else {
    // short blurb (5-20 words)
    const len = 5 + Math.floor(rand() * 16); // 5..20
    return randomWords(len);
  }
}

function randomWords(count) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    // pick a word and occasionally add punctuation
    let w = pick(descWords);
    // randomly capitalize some words to vary appearance
    if (rand() < 0.08) w = w.charAt(0).toUpperCase() + w.slice(1);
    parts.push(w);
  }
  // join into sentences: insert a period every 12-18 words to create readable chunks
  const out = [];
  let i = 0;
  while (i < parts.length) {
    const chunkLen = 6 + Math.floor(rand() * 13); // 6..18
    const chunk = parts.slice(i, i + chunkLen).join(' ');
    out.push(chunk.charAt(0).toUpperCase() + chunk.slice(1) + '.');
    i += chunkLen;
  }
  return out.join(' ');
}

const generatedData = Array.from({ length: 1000 }, (_, i) => {
  const id = i + 1;
  // Generate a deterministic hire date between 2018-01-01 and 2024-12-31
  const baseMs = new Date('2018-01-01').getTime();
  const rangeMs = new Date('2024-12-31').getTime() - baseMs;
  const hireDateMs = baseMs + Math.floor(rand() * rangeMs);
  const hireDateObj = new Date(hireDateMs);
  const hireDate = hireDateObj.toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    id,
    name: makeName(),
    department: pick(departments),
    status: pick(statuses),
    level: pick(levels),
    hireDate,
    description: makeDescription(),
    // Full datetime of the same hire event (with a random hour/minute offset)
    createdAt: (() => {
      const addHours = Math.floor(rand() * 24);
      const addMinutes = Math.floor(rand() * 60);
      const d = new Date(hireDateMs + addHours * 3600000 + addMinutes * 60000);
      // Format as YYYY-MM-DDTHH:mm (local time) for datetime-local inputs
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })(),
  };
});

export const allData = generatedData;

/**
 * Unified ColumnDef array — combines table column config (width, label) with
 * filter config (filterType) in a single array.  Pass this as the `columns`
 * prop to DataTable and to buildColumnFilters() in place of the old separate
 * `tableColumns` / `filterColumns` arrays.
 *
 * Note: `cellSnippet` values require Svelte snippet syntax and must be
 * attached in the consuming Svelte component (see examples/App.svelte).
 *
 * @type {import('../src/lib/index.js').ColumnDef[]}
 */
export const columnDefs = [
  { key: 'id', label: 'ID', width: 1, sortable: true, filterType: 'none' },
  { key: 'name', label: 'Name', width: 3, sortable: true, filterType: 'none' },
  { key: 'department', label: 'Department', width: 2, sortable: true, filterType: 'value' },
  { key: 'status', label: 'Status', width: 1.5, sortable: true, filterType: 'value' },
  { key: 'level', label: 'Level', width: 1.5, sortable: true, filterType: 'value' },
  { key: 'hireDate', label: 'Hire Date', width: 2, sortable: true, filterType: 'daterange' },
  { key: 'createdAt', label: 'Created At', width: 2, sortable: true, filterType: 'datetimerange' },
  { key: 'description', label: 'Description', width: 4, sortable: false, filterType: 'none' },
];
