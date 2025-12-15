# @zhangt58/svelte-vtable

A Svelte 5 library providing virtualized data tables with sorting, selection, search, and pagination controls. Built with Svelte 5 runes for reactive state management.

## Features

- 🚀 **Virtualized rendering** - Efficiently handles large datasets
- 🔄 **Sorting** - Click column headers to sort
- 🔍 **Search** - Built-in search filtering
- 📄 **Pagination** - Configurable page controls with ellipsis navigation
- ✅ **Selection** - Row selection with callback support
- 🎨 **Styling** - Tailwind CSS based with dark mode support
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

## Styling

The library uses Tailwind CSS and includes built-in styles for:
- Light and dark mode
- Alternating row colors
- Hover states
- Selected row highlighting
- Sticky headers

You can import the styles explicitly if needed:

```js
import '@zhangt58/svelte-vtable/styles.css';
```

### CSS Custom Properties

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
