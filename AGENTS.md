# Repository Guidelines

## Project Structure & Module Organization

This is a Svelte 5 component library for virtualized data tables. Source lives in `src/lib/`: public entry points are `index.js` and `index.flowbite.js`, shared styles are in `styles.css`, and Svelte components are under `src/lib/components/`. Flowbite-specific components live in `src/lib/components/flowbite/`; filter UI and state helpers live in `src/lib/components/filters/`. Utility logic such as filtering is in `src/lib/filterUtils.js`.

Tests are in `tests/`, currently focused on utility behavior. The `examples/` app is a Vite/Svelte consumer project for manual validation and demos. `scripts/build-styles.cjs` prepares packaged CSS. Build output goes to `dist/`; do not edit generated files directly.

## Build, Test, and Development Commands

- `npm install`: install library dependencies.
- `npm run build:styles`: generate packaged CSS assets.
- `npm run build`: package `src/lib` with `svelte-package`.
- `npm run check`: run `svelte-check` using `tsconfig.json`.
- `npm run test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run format:check`: verify Prettier formatting.
- `npm run format`: apply Prettier formatting.
- `cd examples && npm install && npm run dev`: run the local example app; its `predev` rebuilds the library first.

## Coding Style & Naming Conventions

Use Prettier as the source of truth for formatting; the existing code uses 2-space indentation and ES modules. Svelte components should use PascalCase filenames, for example `DataTable.svelte`. Utilities, props, callbacks, and local variables should use camelCase. Follow the existing Svelte 5 runes style with `$props`, `$state`, `$derived`, and `$bindable` where appropriate. Keep public exports centralized in the entry point files.

## Testing Guidelines

Use Vitest for unit tests. Add tests under `tests/` with the `*.test.js` suffix, and group behavior with `describe`/`it`. Prefer focused tests for pure utilities and edge cases such as empty values, date boundaries, and filter combinations. Run `npm run test` plus `npm run check` before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short version commits like `0.3.8` and conventional prefixes such as `fix:`, `feat:`, and `chore:`. Keep commit messages concise and imperative when possible.

Pull requests should include a clear summary, test results, and any public API or README changes. For visible table, filter, pagination, or Flowbite UI changes, include screenshots or a note about validation in `examples/`.
