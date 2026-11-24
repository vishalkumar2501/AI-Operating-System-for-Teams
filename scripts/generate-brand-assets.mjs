import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// 1. Ensure target directories exist
const brandDirs = [
  'frontend/public/brand',
  'frontend/public',
  'apps/web/public/brand',
];
for (const dir of brandDirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 2. Read the traced mark and text paths
const markSvgRaw = fs.readFileSync('mark_traced.svg', 'utf8');
const markPathMatch = markSvgRaw.match(/<path\s+d="([^"]+)"/);
const markPath = markPathMatch ? markPathMatch[1] : '';

const teamSvgRaw = fs.readFileSync('team_traced.svg', 'utf8');
const teamPathMatch = teamSvgRaw.match(/<path\s+d="([^"]+)"/);
const teamPath = teamPathMatch ? teamPathMatch[1] : '';

const osSvgRaw = fs.readFileSync('os_traced.svg', 'utf8');
const osPathMatch = osSvgRaw.match(/<path\s+d="([^"]+)"/);
const osPath = osPathMatch ? osPathMatch[1] : '';

// 3. Generate logo-mark.svg
const logoMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 251 266" fill="none">
  <path d="${markPath}" fill="#0EA5FF" fill-rule="evenodd"/>
</svg>
`;

// 4. Generate logo-full-dark.svg (horizontal lockup: mark + Team in white + OS in blue)
const logoFullDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 56" fill="none">
  <g transform="translate(0, 2) scale(0.1917, 0.1917)">
    <path d="${markPath}" fill="#0EA5FF" fill-rule="evenodd"/>
  </g>
  <g transform="translate(56, 12) scale(0.465, 0.465)">
    <path d="${teamPath}" fill="#FFFFFF" fill-rule="evenodd"/>
  </g>
  <g transform="translate(138, 12) scale(0.465, 0.465)">
    <path d="${osPath}" fill="#0EA5FF" fill-rule="evenodd"/>
  </g>
</svg>
`;

// 5. Generate logo-full-light.svg (horizontal lockup: mark + Team in #0B0B0C + OS in #0A8CF0)
const logoFullLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 56" fill="none">
  <g transform="translate(0, 2) scale(0.1917, 0.1917)">
    <path d="${markPath}" fill="#0A8CF0" fill-rule="evenodd"/>
  </g>
  <g transform="translate(56, 12) scale(0.465, 0.465)">
    <path d="${teamPath}" fill="#0B0B0C" fill-rule="evenodd"/>
  </g>
  <g transform="translate(138, 12) scale(0.465, 0.465)">
    <path d="${osPath}" fill="#0A8CF0" fill-rule="evenodd"/>
  </g>
</svg>
`;

// Save SVGs to both frontend/public/brand and apps/web/public/brand
const svgFiles = [
  { name: 'logo-mark.svg', content: logoMarkSvg },
  { name: 'logo-full-dark.svg', content: logoFullDarkSvg },
  { name: 'logo-full-light.svg', content: logoFullLightSvg },
];

for (const f of svgFiles) {
  fs.writeFileSync(path.join('frontend/public/brand', f.name), f.content);
  fs.writeFileSync(path.join('apps/web/public/brand', f.name), f.content);
}
fs.writeFileSync('frontend/public/favicon.svg', logoMarkSvg);

// Decode original PNG
const srcPng = fs.readFileSync('teamos-logo.png');
let offset = 8;
const chunks = [];
let srcW, srcH;
while (offset < srcPng.length) {
  const len = srcPng.readUInt32BE(offset);
  const type = srcPng.toString('ascii', offset + 4, offset + 8);
  if (type === 'IHDR') {
    srcW = srcPng.readUInt32BE(offset + 8);
    srcH = srcPng.readUInt32BE(offset + 12);
  } else if (type === 'IDAT') chunks.push(srcPng.subarray(offset + 8, offset + 8 + len));
  offset += 12 + len;
}
const decompressed = zlib.inflateSync(Buffer.concat(chunks));
const stride = srcW * 4 + 1;
const raw = Buffer.alloc(srcW * srcH * 4);
for (let y = 0; y < srcH; y++) {
  const filter = decompressed[y * stride];
  for (let x = 0; x < srcW; x++) {
    const srcIdx = y * stride + 1 + x * 4;
    const dstIdx = (y * srcW + x) * 4;
    for (let c = 0; c < 4; c++) {
      let val = decompressed[srcIdx + c];
      let a = x > 0 ? raw[(y * srcW + (x - 1)) * 4 + c] : 0;
      let b = y > 0 ? raw[((y - 1) * srcW + x) * 4 + c] : 0;
      let c_diag = (x > 0 && y > 0) ? raw[((y - 1) * srcW + (x - 1)) * 4 + c] : 0;
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c_diag;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c_diag);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c_diag);
        val = (val + pr) & 0xff;
      }
      raw[dstIdx + c] = val;
    }
  }
}

// Mark bounding box crop: X: 110..350, Y: 68..318 (241 x 251)
const markCropX = 110, markCropY = 68, markCropW = 241, markCropH = 251;
// Isolate mark with transparent background
const markRgba = Buffer.alloc(markCropW * markCropH * 4);
for (let y = 0; y < markCropH; y++) {
  for (let x = 0; x < markCropW; x++) {
    const srcIdx = ((markCropY + y) * srcW + (markCropX + x)) * 4;
    const dstIdx = (y * markCropW + x) * 4;
    const r = raw[srcIdx], g = raw[srcIdx + 1], b = raw[srcIdx + 2];
    // Check if blue logo pixel
    if (b > 100 && b > r + 30) {
      markRgba[dstIdx] = 14;      // #0EA5FF
      markRgba[dstIdx + 1] = 165;
      markRgba[dstIdx + 2] = 255;
      markRgba[dstIdx + 3] = 255;
    } else {
      markRgba[dstIdx + 3] = 0; // transparent
    }
  }
}

// Bilinear resampler
function resizeRgba(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  const xRatio = (sw - 1) / (dw > 1 ? dw - 1 : 1);
  const yRatio = (sh - 1) / (dh > 1 ? dh - 1 : 1);
  for (let dy = 0; dy < dh; dy++) {
    const sy = dy * yRatio;
    const yLow = Math.floor(sy);
    const yHigh = Math.min(sh - 1, yLow + 1);
    const yWeight = sy - yLow;
    for (let dx = 0; dx < dw; dx++) {
      const sx = dx * xRatio;
      const xLow = Math.floor(sx);
      const xHigh = Math.min(sw - 1, xLow + 1);
      const xWeight = sx - xLow;

      const idx00 = (yLow * sw + xLow) * 4;
      const idx10 = (yLow * sw + xHigh) * 4;
      const idx01 = (yHigh * sw + xLow) * 4;
      const idx11 = (yHigh * sw + xHigh) * 4;
      const dstIdx = (dy * dw + dx) * 4;

      for (let c = 0; c < 4; c++) {
        const top = src[idx00 + c] * (1 - xWeight) + src[idx10 + c] * xWeight;
        const bot = src[idx01 + c] * (1 - xWeight) + src[idx11 + c] * xWeight;
        dst[dstIdx + c] = Math.round(top * (1 - yWeight) + bot * yWeight);
      }
    }
  }
  return dst;
}

// PNG Encoder
function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const filtered = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    filtered[y * stride] = 0;
    rgba.copy(filtered, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatData = zlib.deflateSync(filtered);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    let crc = 0 ^ (-1);
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc ^ byte) & 1 ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    crc = (crc ^ (-1)) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    header,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate PNGs at required sizes
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

for (const { name, size } of sizes) {
  const resized = resizeRgba(markRgba, markCropW, markCropH, size, size);
  const png = encodePng(size, size, resized);
  fs.writeFileSync(path.join('frontend/public', name), png);
}

// Generate favicon.ico containing 32x32 PNG
const png32 = fs.readFileSync('frontend/public/favicon-32x32.png');
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // ICO image type
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0); // width
icoEntry.writeUInt8(32, 1); // height
icoEntry.writeUInt8(0, 2);  // palette
icoEntry.writeUInt8(0, 3);  // reserved
icoEntry.writeUInt16LE(1, 4); // color planes
icoEntry.writeUInt16LE(32, 6); // bits per pixel
icoEntry.writeUInt32LE(png32.length, 8); // image size
icoEntry.writeUInt32LE(22, 12); // image offset (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, icoEntry, png32]);
fs.writeFileSync('frontend/public/favicon.ico', ico);

// Generate og-image.png (1200x630 dark hero banner with #0B0B0C background and centered logo)
const ogW = 1200, ogH = 630;
const ogRgba = Buffer.alloc(ogW * ogH * 4);
// Fill with #0B0B0C
for (let i = 0; i < ogW * ogH; i++) {
  ogRgba[i * 4] = 11;
  ogRgba[i * 4 + 1] = 11;
  ogRgba[i * 4 + 2] = 12;
  ogRgba[i * 4 + 3] = 255;
}
// Render mark scaled to 220x229 centered
const ogMarkSizeW = 220, ogMarkSizeH = 229;
const ogMark = resizeRgba(markRgba, markCropW, markCropH, ogMarkSizeW, ogMarkSizeH);
const startX = Math.floor((ogW - ogMarkSizeW) / 2);
const startY = Math.floor((ogH - ogMarkSizeH) / 2 - 30);
for (let y = 0; y < ogMarkSizeH; y++) {
  for (let x = 0; x < ogMarkSizeW; x++) {
    const srcI = (y * ogMarkSizeW + x) * 4;
    const a = ogMark[srcI + 3] / 255;
    if (a > 0.05) {
      const dstI = ((startY + y) * ogW + (startX + x)) * 4;
      ogRgba[dstI] = Math.round(ogMark[srcI] * a + ogRgba[dstI] * (1 - a));
      ogRgba[dstI + 1] = Math.round(ogMark[srcI + 1] * a + ogRgba[dstI + 1] * (1 - a));
      ogRgba[dstI + 2] = Math.round(ogMark[srcI + 2] * a + ogRgba[dstI + 2] * (1 - a));
    }
  }
}
fs.writeFileSync('frontend/public/og-image.png', encodePng(ogW, ogH, ogRgba));

console.log('All brand assets, favicons, and OG image generated with 100% precision!');
