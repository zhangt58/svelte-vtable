const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcPath = path.join(repoRoot, 'src', 'lib', 'styles.css');
const outDir = path.join(repoRoot, 'src', 'lib', 'dist');
const outPath = path.join(outDir, 'styles.css');

if (!fs.existsSync(srcPath)) {
  console.error('Source styles.css not found at', srcPath);
  process.exit(2);
}

let css = fs.readFileSync(srcPath, 'utf8');

// Transform common Svelte-scoped :global(...) wrappers into plain selectors
css = css.replace(/:global\(\s*([^)]*?)\s*\)/g, '$1');
// Remove leading/trailing whitespace and collapse multiple blank lines
css = css.replace(/\n{3,}/g, '\n\n').trim() + '\n';

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, css, 'utf8');
console.log('Generated compiled CSS:', outPath);
process.exit(0);
