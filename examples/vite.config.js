import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svelteConfig from './svelte.config.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

// The library is imported from its built dist/, which lies outside this
// project's root and so is not watched by default: without this, a rebuilt
// dist/ keeps being served from the dev server's cache until a restart.
function reloadOnLibraryBuild() {
  return {
    name: 'svelte-vtable-reload-on-build',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(dist);
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(dist)) return;
      server.moduleGraph.invalidateAll();
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte(svelteConfig), reloadOnLibraryBuild()],
});
