# Svelte-VTable Example

This is an example project demonstrating how to use the `@zhangt58/svelte-vtable` library.

## Features Demonstrated

- **DataTableFilters**: Multi-column filtering with various filter types
- **DataTable**: High-performance virtualized data table
- **DataTableControls**: Pagination and table controls
- **Dark Mode**: Complete theme switching support
- **Responsive Design**: Mobile-friendly layouts

## Running the Example Project

### Prerequisites

Before running the example, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** package manager

You can verify your installation by running:

```bash
node --version
npm --version
```

### Quick Start

1. **Clone or navigate to the project**:

   ```bash
   cd /path/to/svelte-vtable
   ```

2. **Navigate to the examples directory**:

   ```bash
   cd examples
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Start the development server**:

   ```bash
   npm run dev
   ```

5. **Open your browser** and visit `http://localhost:5173/`

### Detailed Setup Instructions

#### Step 1: Install Dependencies

The example project has its own `package.json` with all necessary dependencies:

```bash
cd examples
npm install
```

This will install:

- `@zhangt58/svelte-vtable` (local library)
- `svelte` and `@sveltejs/vite-plugin-svelte`
- `tailwindcss` and `@tailwindcss/vite`
- `flowbite-svelte` and `flowbite-svelte-icons`
- Development tools (`vite`, `svelte-check`)

#### Step 2: Development Server

Start the Vite development server:

```bash
npm run dev
```

**Expected Output:**

```
VITE v7.3.0  ready in 290 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

The server will automatically reload when you make changes to the code.

#### Step 3: Access the Example

Open your web browser and navigate to `http://localhost:5173/`

### Alternative Package Managers

If you prefer using Yarn:

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

### Production Build

To build the example for production:

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

### Troubleshooting

#### Common Issues

**1. Port already in use:**
If port 5173 is busy, Vite will automatically use the next available port (e.g., 5174).

**2. Dependencies not installing:**

- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**3. Build errors:**

- Ensure you're in the `examples/` directory
- Check that the main library is built: run `npm run prepare` in the parent directory

**4. Import errors:**

- Make sure the local library is properly linked
- Check that `package.json` has the correct dependency: `"@zhangt58/svelte-vtable": "file:.."`

#### Development Tips

- **Hot Reload**: The dev server automatically reloads on file changes
- **Type Checking**: Run `npm run check` to validate TypeScript/Svelte types
- **Browser DevTools**: Use browser developer tools to inspect components and debug

## Getting Started

### Prerequisites

Make sure you have Node.js and npm installed.

### Installation

1. Navigate to the examples directory:

   ```bash
   cd examples
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

The example will be available at `http://localhost:5173/`

### Building

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

- `App.svelte` - Main application component
- `sampleData.js` - Sample data and column configurations
- `main.js` - Application entry point
- `index.html` - HTML template
- `vite.config.js` - Vite configuration
- `svelte.config.js` - Svelte configuration
- `app.css` - Tailwind CSS imports

## Usage

The example demonstrates:

1. **Filtering**: Use the filter dropdowns to filter data by department, status, and level
2. **Layout**: Switch between horizontal and vertical filter layouts
3. **Theme**: Toggle between light and dark modes
4. **Virtual Table**: Scroll through large datasets efficiently
5. **Controls**: Navigate through paginated results

## Dependencies

This example project depends on:

- `@zhangt58/svelte-vtable` - The main library
- `flowbite-svelte` - UI components
- `tailwindcss` - Styling framework
- `svelte` - Framework
- `vite` - Build tool
