const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'www');

// Ensure www exists and is clean
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// Copy index.html
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(outDir, 'index.html'));

// Copy manifest.json
if (fs.existsSync(path.join(rootDir, 'manifest.json'))) {
  fs.copyFileSync(path.join(rootDir, 'manifest.json'), path.join(outDir, 'manifest.json'));
}

// Copy directories
['css', 'js'].forEach(dir => {
  const src = path.join(rootDir, dir);
  const dest = path.join(outDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
});

console.log('✓ Successfully prepared www directory for Capacitor!');
