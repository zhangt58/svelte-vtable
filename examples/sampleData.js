// Sample dataset for the DataTableFilters demo
export const allData = [
  { id: 1, name: 'Alice Johnson', department: 'Engineering', status: 'Active', level: 'Senior' },
  { id: 2, name: 'Bob Smith', department: 'Engineering', status: 'Active', level: 'Junior' },
  { id: 3, name: 'Carol Williams', department: 'Marketing', status: 'Active', level: 'Mid' },
  { id: 4, name: 'David Brown', department: 'Sales', status: 'Inactive', level: 'Senior' },
  { id: 5, name: 'Eve Davis', department: 'Engineering', status: 'Active', level: 'Mid' },
  { id: 6, name: 'Frank Miller', department: 'HR', status: 'Active', level: 'Junior' },
  { id: 7, name: 'Grace Wilson', department: 'Marketing', status: 'Active', level: 'Senior' },
  { id: 8, name: 'Henry Moore', department: 'Sales', status: 'Inactive', level: 'Mid' },
  { id: 9, name: 'Ivy Taylor', department: 'Engineering', status: 'Active', level: 'Senior' },
  { id: 10, name: 'Jack Anderson', department: 'HR', status: 'Active', level: 'Junior' },
  { id: 11, name: 'Kelly Thomas', department: 'Marketing', status: 'Inactive', level: 'Mid' },
  { id: 12, name: 'Leo Jackson', department: 'Sales', status: 'Active', level: 'Senior' },
];

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
