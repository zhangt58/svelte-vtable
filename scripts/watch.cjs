// Rebuild dist/ (`npm run build`) whenever a file under src/lib changes.
// The examples dev server watches dist/ and reloads the page after a rebuild.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const srcDir = path.join(repoRoot, 'src', 'lib');
const DEBOUNCE_MS = 200;

let timer = null;
let building = false;
let pending = false;

function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const started = Date.now();
  const child = spawn('npm', ['run', '--silent', 'build'], {
    cwd: repoRoot,
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    building = false;
    const time = new Date().toLocaleTimeString();
    if (code === 0) console.log(`[${time}] dist rebuilt in ${Date.now() - started} ms`);
    else console.error(`[${time}] build failed (exit ${code})`);
    if (pending) {
      pending = false;
      build();
    }
  });
}

fs.watch(srcDir, { recursive: true }, (event, file) => {
  // Skip editor swap/backup files and the stale src/lib/dist folder.
  if (!file || /(^|[\\/])(dist[\\/]|\.)|~$|\.sw[po]$/.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(build, DEBOUNCE_MS);
});

console.log(`Watching ${path.relative(repoRoot, srcDir)} — dist/ is rebuilt on change.`);
