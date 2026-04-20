// Flowbite-flavoured adapter components.
// Import from '@zhangt58/svelte-vtable/flowbite' to use these.
// Requires flowbite-svelte as a peer dependency.
export { default as DataTableControls } from './components/flowbite/DataTableControls.svelte';
export { default as FiltersModal } from './components/flowbite/FiltersModal.svelte';

// Re-export everything from the headless entrypoint so consumers can import
// DataTable, DataTableFilters, and utilities from a single path.
export * from './index.js';
