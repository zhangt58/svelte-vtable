import { mount } from 'svelte';
import FiltersDemo from './filters-demo.svelte';

// Import component styles
import '../src/lib/dist/styles.css';

const app = mount(FiltersDemo, {
  target: document.getElementById('app')
});

export default app;

