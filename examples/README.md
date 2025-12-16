# Examples

This directory contains working examples demonstrating the usage of svelte-vtable components.

## Running the Examples

### Prerequisites

Make sure you have installed all dependencies:

```bash
npm install
```

### Start the Development Server

```bash
npm run dev:example
```

This will start a Vite development server and open your browser to `http://localhost:5173` (or another port if 5173 is in use).

## Available Examples

### DataTableFilters Demo

**File**: `filters-demo.svelte`

A comprehensive demonstration of the DataTableFilters component showing:

- Multi-select dropdown filters for each column
- OR logic within same column (selecting multiple values matches ANY)
- AND logic across columns (all active filters must match)
- Real-time filtering of sample employee data
- Active filter indicators with count badges
- Individual column and "Clear All" functionality
- Layout toggle (horizontal/vertical)
- Value counts display

**Features demonstrated:**
- Building column filters from data using `buildColumnFilters()`
- Applying filters with `applyFilters()`
- Counting active filters with `countActiveFilters()`
- Dynamic layout switching
- Integration with a data table display

### How the Example Works

1. **Sample Data**: Uses a mock dataset of 12 employees with properties like department, status, and level

2. **Column Filters**: Automatically extracts unique values and counts from the data

3. **Filter Logic**: 
   - Selecting "Engineering" OR "Sales" in Department filter
   - Then selecting "Active" in Status filter
   - Results in: (Department=Engineering OR Department=Sales) AND Status=Active

4. **Real-time Updates**: The filtered results update immediately as you select/deselect filter options

5. **Layout Options**: Toggle between horizontal grid and vertical stack layouts

## Project Structure

```
examples/
├── index.html              # Main HTML entry point
├── main.js                 # JavaScript entry point (mounts Svelte app)
├── filters-demo.svelte     # DataTableFilters demo component
├── vite.config.js          # Vite configuration for examples
└── README.md               # This file
```

## Adding New Examples

To add a new example:

1. Create a new `.svelte` file in this directory
2. Import it in `main.js` or create a new entry point
3. Update `index.html` to include navigation if needed
4. Add documentation here

## Development

The examples use Vite for hot module replacement, so changes you make to the example files or the source components will automatically reload in the browser.

## Troubleshooting

### Port Already in Use

If you see "Port 5173 is in use", Vite will automatically try the next available port. Check the terminal output for the actual URL.

### Module Not Found

Make sure you've run `npm install` in the root directory to install all dependencies including:
- `flowbite-svelte`
- `svelte-virtuallists`
- `svelte`
- `vite`

### Styles Not Loading

The examples automatically import the compiled CSS from `../src/lib/dist/styles.css`. If styles aren't loading:

1. Run `npm run build:styles` to regenerate the CSS
2. Check that `src/lib/dist/styles.css` exists
3. Clear your browser cache

## Related Documentation

- [DataTableFilters README](../DATATABLEFILTERS_README.md) - Full API documentation
- [Integration Guide](../INTEGRATION_GUIDE.md) - Step-by-step integration instructions
- [Quick Reference](../QUICK_REFERENCE.md) - Developer quick reference
- [Visual Guide](../VISUAL_GUIDE.md) - Visual diagrams and flows

## License

MIT

