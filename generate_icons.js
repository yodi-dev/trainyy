import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// PNG CRC32 table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = data ? data.length : 0
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(len, 0)
  
  const toCrc = data ? Buffer.concat([typeBuf, data]) : typeBuf
  const crcVal = crc32(toCrc)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crcVal, 0)

  return Buffer.concat([lenBuf, toCrc, crcBuf])
}

// Distance helper to line segment
function distToSeg(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
  if (l2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))
}

function generatePng(size) {
  const width = size
  const height = size
  const rowBytes = 1 + width * 4 // 1 filter byte + RGBA
  const rawData = Buffer.alloc(rowBytes * height)

  const center = size / 2
  const cornerRadius = size * 0.24

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4

      // 1. Squircle / Rounded rectangle mask
      const dx = Math.max(0, Math.abs(x - center) - (center - cornerRadius))
      const dy = Math.max(0, Math.abs(y - center) - (center - cornerRadius))
      const distFromCorner = Math.sqrt(dx * dx + dy * dy)

      if (distFromCorner > cornerRadius) {
        rawData[pxOffset] = 0
        rawData[pxOffset + 1] = 0
        rawData[pxOffset + 2] = 0
        rawData[pxOffset + 3] = 0
        continue
      }

      // 2. Base Background: Deep Obsidian / Indigo Canvas
      const bgGrad = (x + y) / (width + height)
      let r = Math.round(15 - 6 * bgGrad) // 15 to 9 (#0f172a to #090d16)
      let g = Math.round(23 - 10 * bgGrad) // 23 to 13
      let b = Math.round(42 - 20 * bgGrad) // 42 to 22

      // Subtle glowing border near the edge
      const edgeDist = cornerRadius - distFromCorner
      if (edgeDist < size * 0.035) {
        const borderAlpha = Math.max(0, 1 - edgeDist / (size * 0.035)) * 0.45
        r = Math.round(r * (1 - borderAlpha) + 99 * borderAlpha)
        g = Math.round(g * (1 - borderAlpha) + 102 * borderAlpha)
        b = Math.round(b * (1 - borderAlpha) + 241 * borderAlpha)
      }

      // Normalized coordinates (0 to 1)
      const nx = x / size
      const ny = y / size

      // 3. T-Y Bespoke Geometric Monogram
      // Part A: Top Bar of 'T' (rounded pill from nx 0.22 to 0.78, ny ~0.25)
      const tBarDist = distToSeg(nx, ny, 0.25, 0.25, 0.75, 0.25)
      const tBarRadius = 0.052

      // Part B: Left branch of 'Y'
      const leftYDist = distToSeg(nx, ny, 0.32, 0.28, 0.50, 0.54)
      const branchRadius = 0.045

      // Part C: Right branch of 'Y'
      const rightYDist = distToSeg(nx, ny, 0.68, 0.28, 0.50, 0.54)

      // Part D: Central vertical stem of 'T' & 'Y'
      const stemDist = distToSeg(nx, ny, 0.50, 0.54, 0.50, 0.78)
      const stemRadius = 0.050

      // Part E: Center Spark
      const sparkDist = Math.hypot(nx - 0.50, ny - 0.54)

      const aa = 0.012 // Anti-aliasing margin

      // Render Left Branch (Crisp White / Silver)
      if (leftYDist < branchRadius + aa) {
        const alpha = Math.min(1, Math.max(0, (branchRadius + aa - leftYDist) / aa))
        r = Math.round(r * (1 - alpha) + 248 * alpha)
        g = Math.round(g * (1 - alpha) + 250 * alpha)
        b = Math.round(b * (1 - alpha) + 252 * alpha)
      }

      // Render Right Branch (Vibrant Violet / Indigo)
      if (rightYDist < branchRadius + aa) {
        const alpha = Math.min(1, Math.max(0, (branchRadius + aa - rightYDist) / aa))
        r = Math.round(r * (1 - alpha) + 168 * alpha)
        g = Math.round(g * (1 - alpha) + 85 * alpha)
        b = Math.round(b * (1 - alpha) + 247 * alpha)
      }

      // Render Central Vertical Stem (Gradient Indigo to Violet)
      if (stemDist < stemRadius + aa) {
        const alpha = Math.min(1, Math.max(0, (stemRadius + aa - stemDist) / aa))
        const sGrad = (ny - 0.54) / 0.24
        const sr = Math.round(99 + (124 - 99) * sGrad)
        const sg = Math.round(102 + (58 - 102) * sGrad)
        const sb = Math.round(241 + (237 - 241) * sGrad)
        r = Math.round(r * (1 - alpha) + sr * alpha)
        g = Math.round(g * (1 - alpha) + sg * alpha)
        b = Math.round(b * (1 - alpha) + sb * alpha)
      }

      // Render Top Bar of 'T' (Electric Indigo #6366f1)
      if (tBarDist < tBarRadius + aa) {
        const alpha = Math.min(1, Math.max(0, (tBarRadius + aa - tBarDist) / aa))
        const tGrad = (nx - 0.25) / 0.50
        const tr = Math.round(99 + (139 - 99) * tGrad)
        const tg = Math.round(102 + (92 - 102) * tGrad)
        const tb = Math.round(241 + (246 - 241) * tGrad)
        r = Math.round(r * (1 - alpha) + tr * alpha)
        g = Math.round(g * (1 - alpha) + tg * alpha)
        b = Math.round(b * (1 - alpha) + tb * alpha)
      }

      // Render Center Apex Spark (Cyan #38bdf8)
      if (sparkDist < 0.038) {
        const alpha = Math.min(1, Math.max(0, (0.038 - sparkDist) / 0.008))
        r = Math.round(r * (1 - alpha) + 56 * alpha)
        g = Math.round(g * (1 - alpha) + 189 * alpha)
        b = Math.round(b * (1 - alpha) + 248 * alpha)
      }

      rawData[pxOffset] = r
      rawData[pxOffset + 1] = g
      rawData[pxOffset + 2] = b
      rawData[pxOffset + 3] = 255
    }
  }

  // Deflate
  const compressed = zlib.deflateSync(rawData)

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8  // 8-bit depth
  ihdrData[9] = 6  // RGBA color
  ihdrData[10] = 0 // Compression: deflate
  ihdrData[11] = 0 // Filter: adaptive
  ihdrData[12] = 0 // Interlace: none

  const ihdrChunk = makeChunk('IHDR', ihdrData)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', null)

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const publicDir = path.join(process.cwd(), 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// 1. Generate Favicon SVG (Bespoke Interlocking T-Y Monogram)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f172a" />
      <stop offset="1" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="25" y1="20" x2="95" y2="95" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6366f1" />
      <stop offset="1" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#38bdf8" />
      <stop offset="1" stop-color="#6366f1" />
    </linearGradient>
  </defs>

  <!-- Squircle Base Canvas -->
  <rect x="4" y="4" width="112" height="112" rx="28" fill="url(#bgGrad)" stroke="rgba(99, 102, 241, 0.4)" stroke-width="2.5" />

  <!-- Subtle Glow Backdrop -->
  <circle cx="60" cy="56" r="32" fill="#6366f1" opacity="0.16" />

  <!-- T-Y Bespoke Geometric Monogram -->
  <!-- Top Crossbar of 'T' -->
  <rect x="26" y="24" width="68" height="13" rx="6.5" fill="url(#primaryGrad)" />

  <!-- Left Branch of 'Y' (Crisp Silver White) -->
  <path d="M33 37 L54 65 L60 65 L43 37 Z" fill="#ffffff" opacity="0.95" />

  <!-- Right Branch of 'Y' (Violet / Indigo) -->
  <path d="M87 37 L66 65 L60 65 L77 37 Z" fill="#a855f7" />

  <!-- Central Stem of 'T' & 'Y' -->
  <rect x="54" y="65" width="12" height="31" rx="6" fill="url(#primaryGrad)" />

  <!-- Apex Spark Point -->
  <circle cx="60" cy="65" r="3.5" fill="#38bdf8" />
</svg>`

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg)

// 2. Generate High-Res PNG icons
const sizes = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
]

for (const { file, size } of sizes) {
  const pngBuf = generatePng(size)
  fs.writeFileSync(path.join(publicDir, file), pngBuf)
}

console.log('Trainyy bespoke T-Y icons successfully created in public/ folder!')
