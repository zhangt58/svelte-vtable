// Sample dataset for the DataTableFilters demo

// Generate a larger sample dataset (1000 rows) deterministically using a simple LCG PRNG.
const firstNames = [
  'Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kelly', 'Leo',
  'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rose', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yara', 'Zane'
];
const lastNames = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
  'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark'
];
const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Support', 'Product', 'Finance'];
const statuses = ['Active', 'Inactive', 'On Leave'];
const levels = ['Junior', 'Mid', 'Senior', 'Lead'];

// Small linear congruential generator for deterministic pseudo-random numbers
function lcg(seed) {
  let state = seed >>> 0;
  return function() {
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
  'research', 'development', 'system', 'analysis', 'design', 'implementation', 'performance', 'scalable', 'robust', 'user',
  'interface', 'algorithm', 'optimization', 'prototype', 'feature', 'integration', 'testing', 'deployment', 'cloud', 'service',
  'database', 'management', 'security', 'protocol', 'model', 'training', 'evaluation', 'experiment', 'data', 'visualization',
  'component', 'module', 'workflow', 'automation', 'script', 'library', 'package', 'version', 'support', 'maintenance',
  'policy', 'regression', 'benchmark', 'latency', 'throughput', 'cache', 'index', 'query', 'pipeline', 'stream'
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
  return {
    id,
    name: makeName(),
    department: pick(departments),
    status: pick(statuses),
    level: pick(levels),
    description: makeDescription()
  };
});

export const allData = generatedData;

// Define columns to filter on
export const filterColumns = [
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'level', label: 'Level' }
];

// Define table columns for VirtualDataTable
export const tableColumns = [
  { key: 'id', label: 'ID', stretch: 1 },
  { key: 'name', label: 'Name', stretch: 3 },
  { key: 'department', label: 'Department', stretch: 2 },
  { key: 'status', label: 'Status', stretch: 1.5 },
  { key: 'level', label: 'Level', stretch: 1.5 },
  { key: 'description', label: 'Description', stretch: 4 }
];
