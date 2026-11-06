/**
 * NEXUS - Icon PNG Generator
 * Renders icon.svg to multiple PNG sizes using Canvas API (Node.js with canvas package)
 * Or falls back to writing placeholder PNGs if canvas not available.
 * Run once: node assets/icons/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname);
const SVG_PATH = path.join(ICON_DIR, 'icon.svg');

// Sizes to generate
const SIZES = [
  { size: 32,  name: 'favicon-32.png',         maskable: false },
  { size: 180, name: 'apple-touch-icon.png',   maskable: false },
  { size: 192, name: 'icon-192.png',           maskable: false },
  { size: 512, name: 'icon-512.png',           maskable: false },
  { size: 512, name: 'icon-512-maskable.png',  maskable: true  },
];

async function generateWithCanvas() {
  const { createCanvas, loadImage } = require('canvas');
  const svgContent = fs.readFileSync(SVG_PATH, 'utf8');
  const svgBuffer = Buffer.from(svgContent);
  const img = await loadImage(svgBuffer);

  for (const { size, name, maskable } of SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    if (maskable) {
      // Maskable: fill entire canvas with background, draw icon in center 80% (safe zone)
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, size, size);
      const pad = size * 0.1;
      const inner = size * 0.8;
      ctx.drawImage(img, pad, pad, inner, inner);
    } else {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    }

    const buffer = canvas.toBuffer('image/png');
    const outPath = path.join(ICON_DIR, name);
    fs.writeFileSync(outPath, buffer);
    console.log(`[NEXUS Icons] Generated: ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
  }
}

async function generateWithInkscape() {
  const { execSync } = require('child_process');
  for (const { size, name } of SIZES) {
    const outPath = path.join(ICON_DIR, name);
    try {
      execSync(`inkscape "${SVG_PATH}" --export-png="${outPath}" --export-width=${size} --export-height=${size}`, { stdio: 'pipe' });
      console.log(`[NEXUS Icons] Inkscape generated: ${name}`);
    } catch (e) {
      console.warn(`[NEXUS Icons] Inkscape failed for ${name}: ${e.message}`);
    }
  }
}

async function main() {
  try {
    require.resolve('canvas');
    console.log('[NEXUS Icons] Using node-canvas for PNG generation...');
    await generateWithCanvas();
  } catch (e) {
    console.log('[NEXUS Icons] node-canvas not available, trying Inkscape...');
    try {
      await generateWithInkscape();
    } catch (inkErr) {
      console.error('[NEXUS Icons] No PNG renderer available. Using existing PNGs or install node-canvas: npm install canvas');
      console.log('[NEXUS Icons] You can also open assets/icons/icon.svg in any browser and save as PNG for each size.');
    }
  }
}

main();
