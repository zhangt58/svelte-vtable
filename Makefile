# Local development for @zhangt58/svelte-vtable.
# Run `make` (or `make help`) to list the targets.

EXAMPLES := examples
PORT ?= 5173

.DEFAULT_GOAL := help
.PHONY: help install build watch serve dev check test format format-check verify \
	example-build example-preview pack clean

help: ## List the targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (library and examples)
	npm install
	cd $(EXAMPLES) && npm install

build: ## Build the package into dist/ (components + compiled styles.css)
	npm run build

watch: ## Rebuild dist/ whenever src/lib changes
	node scripts/watch.cjs

serve: ## Run the examples dev server on dist/ (PORT=5173); builds dist/ first
	cd $(EXAMPLES) && npm run dev -- --port $(PORT)

dev: build ## Watch src/lib and run the examples dev server; edits reload the page
	@$(MAKE) --no-print-directory -j2 watch serve-only

.PHONY: serve-only
serve-only:
	cd $(EXAMPLES) && npx vite --port $(PORT)

check: ## Type-check with svelte-check
	npm run check

test: ## Run the Vitest suite
	npm run test

format: ## Format with Prettier
	npm run format

format-check: ## Check formatting with Prettier
	npm run format:check

verify: build check test ## Build, type-check and test (before a PR or release)

example-build: ## Production build of the examples (uses dist/)
	cd $(EXAMPLES) && npm run build

example-preview: example-build ## Serve the examples production build
	cd $(EXAMPLES) && npm run preview -- --port $(PORT)

pack: build ## Show what `npm publish` would ship
	npm pack --dry-run

clean: ## Remove build output (dist/, examples/dist/)
	rm -rf dist $(EXAMPLES)/dist
