# @zhangt58/svelte-vtable

A Svelte 5 library providing virtualized data tables with sorting, selection, search, and pagination controls. Built with Svelte 5 runes for reactive state management.

## Features

- 🚀 **Virtualized rendering** - Efficiently handles large datasets
- 🔄 **Sorting** - Click column headers to sort
- 🔍 **Search** - Built-in search filtering
- 📄 **Pagination** - Configurable page controls with ellipsis navigation
- ✅ **Selection** - Row selection with callback support
- 🎨 **Styling** - Tailwind CSS based with light/dark mode support
- 📱 **Responsive** - Flexible column widths with stretch weights

## Installation

```bash
npm install @zhangt58/svelte-vtable
```

## Peer Dependencies

This library requires the following peer dependencies to be installed in your project:

```bash
npm install svelte@^5.0.0 tailwindcss@^4.0.0 flowbite-svelte@^1.0.0 flowbite-svelte-icons@^3.0.0 svelte-virtuallists@^1.0.0
```

## Quick Start

```svelte
<script>
  import { VirtualDataTable, DataTableControls } from '@zhangt58/svelte-vtable';

  let items = $state([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    // ... more items
  ]);

  const ui = $state({
    searchQuery: '',
    currentPage: 1,
    perPage: 25,
    sortKey: null,
    sortDir: 'asc'
  });

  const visibleKeys = ['name', 'email'];
  const colWidths = { name: 1, email: 2 }; // stretch weights
</script>

<DataTableControls
  search={ui.searchQuery}
  currentPage={ui.currentPage}
  perPage={ui.perPage}
  totalItems={items.length}
  pagechange={(e) => ui.currentPage = e.currentPage}
  searchchange={(e) => ui.searchQuery = e.search}
/>

<VirtualDataTable
  {items}
  {visibleKeys}
  sortKey={ui.sortKey}
  sortDir={ui.sortDir}
  sortCallback={(key) => { /* handle sort */ }}
  selectCallback={(detail) => { /* handle selection */ }}
  {colWidths}
>
  {#snippet rowSnippet({item, index, select, selected})}
    <tr onclick={select}>
      <td>{item.name}</td>
      <td>{item.email}</td>
    </tr>
  {/snippet}
</VirtualDataTable>
```

## Components

### VirtualDataTable

A virtualized table component for efficient rendering of large datasets.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | `[]` | Array of data items to display |
| `visibleKeys` | `Array` | `[]` | Array of keys/titles to display as column headers |
| `sortKey` | `string \| null` | `null` | Current sort key (column header) |
| `sortDir` | `'asc' \| 'desc'` | `'asc'` | Sort direction |
| `className` | `string` | `''` | Additional CSS classes |
| `style` | `string` | `''` | Inline styles |
| `emptyMessage` | `string` | `'No items to display.'` | Message when no items |
| `colWidths` | `object \| Array` | `{}` | Column width configuration (stretch weights or pixel values) |
| `selected` | `any` | `null` | Currently selected item |
| `selectCallback` | `function` | `() => {}` | Callback when a row is selected: `({item, index}) => void` |
| `sortCallback` | `function` | `defaultSort` | Callback when sorting: `(headerKey) => void` |
| `rowSnippet` | `Snippet` | required | Svelte 5 snippet for rendering rows |

#### Row Snippet Parameters

The `rowSnippet` receives an object with:
- `item` - The current row data
- `index` - Row index in the current page
- `select` - Function to call to select this row
- `selected` - Currently selected item (for comparison)

#### Column Widths

Column widths can be specified as:
- **Stretch weights** (numbers): Distributed proportionally, e.g., `{ name: 1, description: 3 }`
- **Pixel values** (strings): Fixed widths, e.g., `{ id: '80px', name: '200px' }`

### DataTableControls

Controls component for search and pagination.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `search` | `string` | `''` | Current search query |
| `currentPage` | `number` | `1` | Current page number |
| `perPage` | `number` | `25` | Items per page |
| `totalItems` | `number` | `0` | Total number of items |
| `pagechange` | `function` | `() => {}` | Callback for page changes: `({currentPage}) => void` |
| `searchchange` | `function` | `() => {}` | Callback for search changes: `({search}) => void` |

## Styling (important)

This library ships with built-in CSS to provide sensible default visuals (light/dark mode, striping, hover, selection, sticky headers, and pagination control styling). There are two important details to understand so the styles work correctly for both local development and package consumers:

1) Source vs published CSS
- The human-editable source is `src/lib/styles.css`. It is written using Svelte-style `:global(...)` wrappers so the selectors are clear and scoped intentionally when compiled inside Svelte components.
- Bundlers and consumer projects do not process Svelte `:global(...)` tokens when they load plain `.css` files. For that reason the package publishes a compiled plain-CSS file at `src/lib/dist/styles.css`. This compiled file has the `:global(...)` wrappers removed so the selectors are normal CSS selectors and will match in any bundler.

2) How you should import the styles as a consumer
- Recommended (installed from npm):

```js
import '@zhangt58/svelte-vtable/styles.css';
```

This import resolves to the precompiled `src/lib/dist/styles.css` via the package `exports` entry in `package.json`.

- Working inside the repo or during local development (components import the file relatively):

Components inside this package import the compiled CSS via:

```css
@import '../lib/dist/styles.css';
```

Do not import the raw `src/lib/styles.css` from components or consumers — the `:global(...)` wrappers will remain and selectors won't behave as intended outside the Svelte compiler.

3) How :global works here and why we compile it
- `:global(.selector)` is a Svelte compiler token used when writing styles in Svelte components. It tells the Svelte compiler to treat the selector as global instead of scoping it to the component.
- When shipping plain `.css` files to consumers, those tokens must be converted into regular selectors. The repository contains a tiny build script (`scripts/build-styles.cjs`) that strips `:global(...)` wrappers and emits a compiled `src/lib/dist/styles.css`. This is what gets published and what consumers should import.

4) Build scripts and publishing
- The project has a `build:styles` script that generates `src/lib/dist/styles.css` from `src/lib/styles.css`:

```bash
npm run build:styles
```

- `package.json` already runs `npm run build:styles` as part of `prepublishOnly` to ensure the compiled CSS is present before publishing.

Optional recommendation: add `prepare` to `package.json` so that `npm install` in development or certain CI flows will also generate the compiled CSS automatically:

```json
"scripts": {
  "build:styles": "node ./scripts/build-styles.cjs",
  "prepare": "npm run build:styles",
  "prepublishOnly": "npm run build:styles && npm run check"
}
```

This is optional — the current `prepublishOnly` is sufficient for publishing.

## CSS Custom Properties

Override these CSS variables to customize appearance:

```css
:root {
  --tbl-head-bg: #f8f9fa; /* Header background */
}
```

## TypeScript

The library is written in JavaScript with JSDoc annotations. Type checking is available via `svelte-check`.

## License

MIT © [zhangt58](https://github.com/zhangt58)
