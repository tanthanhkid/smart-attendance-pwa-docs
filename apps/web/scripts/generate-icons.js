// Script to generate PWA icons from SVG
// Run with: node scripts/generate-icons.js
// Requires: sharp (npm install sharp)
//
// Alternatively, use online tools like:
// - https://realfavicongenerator.net/
// - https://cloudconvert.com/svg-to-png

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public', 'icons');

// Create placeholder SVG for each size
const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#111827"/>
      <stop offset="100%" style="stop-color:#374151"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.19}" fill="url(#bg)"/>
  <circle cx="${size/2}" cy="${size * 0.39}" r="${size * 0.2}" fill="none" stroke="#10B981" stroke-width="${size * 0.05}"/>
  <line x1="${size/2}" y1="${size * 0.39}" x2="${size/2}" y2="${size * 0.25}" stroke="#10B981" stroke-width="${size * 0.04}" stroke-linecap="round"/>
  <line x1="${size/2}" y1="${size * 0.39}" x2="${size * 0.61}" y2="${size * 0.39}" stroke="#10B981" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  <circle cx="${size/2}" cy="${size * 0.39}" r="${size * 0.025}" fill="#10B981"/>
  <rect x="${size * 0.28}" y="${size * 0.66}" width="${size * 0.44}" height="${size * 0.16}" rx="${size * 0.025}" fill="#10B981"/>
  <text x="${size/2}" y="${size * 0.77}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size * 0.08}" font-weight="bold" fill="white">IN</text>
</svg>`;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);
  fs.writeFileSync(filepath, svgTemplate(size));
  console.log(`Created ${filename}`);
});

console.log('\nNote: These are SVG files. For PNG icons required by some browsers:');
console.log('1. Use https://realfavicongenerator.net/ with the SVG source');
console.log('2. Or convert using: npx @aspect-build/magika icons/icon.svg --output-dir public/icons');
