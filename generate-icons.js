/**
 * NEXUS - Pure Node.js PNG icon generator using raw PNG encoding
 * No external dependencies. Generates solid-color placeholder PNGs that the browser
 * can use. The real visual comes from icon.svg (browser renders SVG perfectly).
 * 
 * This generates pixel-perfect PNGs by embedding the SVG as a data URI inside
 * an HTML page and using puppeteer — or falls back to creating minimal valid PNGs
 * with the NEXUS brand colors if no renderer is available.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICON_DIR = path.join(__dirname, 'assets', 'icons');

// ---- Minimal PNG writer (no deps) ----
function writePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA values, row by row
  function crc32(buf) {
    const table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = data.length;
    const buf = Buffer.allocUnsafe(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 'ascii');
    if (len > 0) data.copy(buf, 8);
    const crc = crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Build raw image data with filter byte prefix per row
  const rowSize = width * 4;
  const rawData = Buffer.allocUnsafe((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (rowSize + 1)] = 0; // filter: none
    pixels.copy(rawData, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB -- wait, we use RGBA
  // Actually use RGBA (colorType=6)
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function generateIconPixels(size, maskable) {
  const pixels = Buffer.allocUnsafe(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const pad = maskable ? size * 0.1 : 0;
  const r_outer = size * (maskable ? 0.38 : 0.44);
  const r_core = size * (maskable ? 0.14 : 0.16);
  const r_orb = size * (maskable ? 0.08 : 0.09);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Background: deep space gradient
      let r = 3, g = 7, b = 18, a = 255;

      // Rounded square clip (for non-maskable)
      if (!maskable) {
        const rx = Math.abs(x - cx);
        const ry = Math.abs(y - cy);
        const cornerR = size * 0.19;
        if (rx > size / 2 - cornerR && ry > size / 2 - cornerR) {
          const cdx = rx - (size / 2 - cornerR);
          const cdy = ry - (size / 2 - cornerR);
          if (Math.sqrt(cdx * cdx + cdy * cdy) > cornerR) {
            pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
            continue;
          }
        }
      }

      // Radial glow overlay
      const glowT = Math.max(0, 1 - dist / (size * 0.42));
      r = Math.round(3 + 10 * glowT);
      g = Math.round(7 + 20 * glowT);
      b = Math.round(18 + 46 * glowT);

      // Hexagon outline
      const hexDist = hexagonDist(dx, dy, r_outer);
      if (hexDist >= -2 && hexDist < 3) {
        const t = (angle + Math.PI) / (2 * Math.PI); // 0..1
        // Cyan to violet gradient
        r = Math.round(34 + (168 - 34) * t);
        g = Math.round(211 + (85 - 211) * t);
        b = Math.round(238 + (247 - 238) * t);
        a = Math.round(200 * (1 - Math.abs(hexDist) / 4));
      }

      // Inner hex fill (glass)
      const innerHex = hexagonDist(dx, dy, r_outer - 6);
      if (innerHex < 0 && dist > r_core * 1.6) {
        const fill = 0.18;
        r = Math.round(r * (1 - fill) + 13 * fill);
        g = Math.round(g * (1 - fill) + 26 * fill);
        b = Math.round(b * (1 - fill) + 50 * fill);
        a = 220;
      }

      // Core glow
      if (dist < r_core * 1.4) {
        const t2 = 1 - dist / (r_core * 1.4);
        const tr = (angle + Math.PI) / (2 * Math.PI);
        const cr = Math.round(34 + (168 - 34) * tr);
        const cg = Math.round(211 * (1 - tr) + 85 * tr);
        const cb = Math.round(238 + (247 - 238) * tr);
        const blend = t2 * 0.85;
        r = Math.round(r * (1 - blend) + cr * blend);
        g = Math.round(g * (1 - blend) + cg * blend);
        b = Math.round(b * (1 - blend) + cb * blend);
        a = 255;
      }

      // Bright core
      if (dist < r_orb) {
        r = Math.round(34 + (255 - 34) * (1 - dist / r_orb));
        g = Math.round(211 + (255 - 211) * (1 - dist / r_orb));
        b = 238;
        a = 255;
      }

      pixels[idx]   = Math.min(255, Math.max(0, r));
      pixels[idx+1] = Math.min(255, Math.max(0, g));
      pixels[idx+2] = Math.min(255, Math.max(0, b));
      pixels[idx+3] = a;
    }
  }

  return pixels;
}

function hexagonDist(dx, dy, r) {
  // Signed distance to regular hexagon edge
  const q = Math.abs(dx);
  const p = Math.abs(dy);
  const s = Math.max(0, (q * 0.866 + p * 0.5 - r * 0.866));
  const dist = Math.sqrt(s * s + Math.max(0, p - r) * Math.max(0, p - r));
  const inside = !(q * 0.866 + p * 0.5 > r * 0.866 || p > r);
  return inside ? -dist : dist;
}

const SIZES = [
  { size: 32,  name: 'favicon-32.png',         maskable: false },
  { size: 180, name: 'apple-touch-icon.png',   maskable: false },
  { size: 192, name: 'icon-192.png',           maskable: false },
  { size: 512, name: 'icon-512.png',           maskable: false },
  { size: 512, name: 'icon-512-maskable.png',  maskable: true  },
];

console.log('[NEXUS Icons] Generating holographic icon PNGs (pure Node.js, no deps)...');
for (const { size, name, maskable } of SIZES) {
  const pixels = generateIconPixels(size, maskable);
  const pngBuf = writePNG(size, size, pixels);
  const outPath = path.join(ICON_DIR, name);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`[NEXUS Icons] ✓ ${name} (${size}×${size}${maskable ? ', maskable' : ''})`);
}
console.log('[NEXUS Icons] All icons generated successfully.');
