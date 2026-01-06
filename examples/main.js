import { mount } from 'svelte';
import App from './App.svelte';

// Import Tailwind CSS
import './app.css';

// Import component styles
import '@zhangt58/svelte-vtable/styles.css';

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
