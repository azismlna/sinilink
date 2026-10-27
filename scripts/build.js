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

// Ensure Capacitor core runtime & Bluetooth-le plugin exist in www
const capCoreSrc = path.join(rootDir, 'node_modules', '@capacitor', 'core', 'dist', 'capacitor.js');
if (fs.existsSync(capCoreSrc)) {
  fs.copyFileSync(capCoreSrc, path.join(outDir, 'capacitor.js'));
  fs.copyFileSync(capCoreSrc, path.join(rootDir, 'capacitor.js'));
}

const capBleSrc = path.join(rootDir, 'node_modules', '@capacitor-community', 'bluetooth-le', 'dist', 'plugin.js');
if (fs.existsSync(capBleSrc)) {
  let content = fs.readFileSync(capBleSrc, 'utf8');
  content += '\nif (typeof window !== "undefined") {\n  window.capacitorCommunityBluetoothLe = capacitorCommunityBluetoothLe;\n  window.BleClient = capacitorCommunityBluetoothLe ? capacitorCommunityBluetoothLe.BleClient : null;\n}\n';
  fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'js', 'capacitor-bluetooth-le.js'), content, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'js', 'capacitor-bluetooth-le.js'), content, 'utf8');
}

console.log('✓ Successfully prepared www directory and native Capacitor runtime!');
