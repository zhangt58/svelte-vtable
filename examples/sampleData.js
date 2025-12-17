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

const generatedData = Array.from({ length: 1000 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    name: makeName(),
    department: pick(departments),
    status: pick(statuses),
    level: pick(levels)
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
  { key: 'level', label: 'Level', stretch: 1.5 }
];
