// Script to copy all Maki SVG icons to Angular assets folder
// Run with: node copy-maki-icons.js

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'node_modules', '@mapbox', 'maki', 'icons');
const destDir = path.join(__dirname, 'src', 'assets', 'map-icons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.readdirSync(srcDir).forEach(file => {
  if (file.endsWith('.svg')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
});

console.log('All Maki icons copied to src/assets/map-icons/');
