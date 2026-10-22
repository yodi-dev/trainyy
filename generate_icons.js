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

function generatePng(size) {
  const width = size
  const height = size
  const rowBytes = 1 + width * 4 // 1 filter byte + RGBA
  const rawData = Buffer.alloc(rowBytes * height)

  const center = size / 2
  const cornerRadius = size * 0.22

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4

      // Rounded rectangle mask
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

      // Background gradient: Deep Indigo (#3730a3) to Electric Violet (#7c3aed)
      const grad = (x + y) / (width + height)
      let r = Math.round(55 + (124 - 55) * grad)
      let g = Math.round(48 + (58 - 48) * grad)
      let b = Math.round(163 + (237 - 163) * grad)

      // Draw stylized "T" + Lightning bolt spark
      const nx = x / size
      const ny = y / size

      // Helper: point in polygon
      function pointInPoly(px, py, vertices) {
        let inside = false
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i][0], yi = vertices[i][1]
          const xj = vertices[j][0], yj = vertices[j][1]
          const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
          if (intersect) inside = !inside
        }
        return inside
      }

      // Lightning bolt vertices: (x, y) normalized 0 to 1
      const boltPoly = [
        [0.55, 0.22],
        [0.34, 0.52],
        [0.48, 0.52],
        [0.42, 0.78],
        [0.68, 0.44],
        [0.54, 0.44]
      ]

      // Top horizontal bar of 'T' (rounded)
      const isTBar = (ny >= 0.22 && ny <= 0.30 && nx >= 0.26 && nx <= 0.74)
      const isLightning = pointInPoly(nx, ny, boltPoly)

      if (isTBar || isLightning) {
        // Glowing white / light amber fill
        r = 255
        g = 255
        b = 255
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

// 1. Generate Favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="24" fill="url(#grad)" />
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4f46e5" />
      <stop offset="1" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect x="25" y="22" width="50" height="9" rx="4.5" fill="#ffffff" />
  <polygon points="56,22 34,53 49,53 42,78 68,44 53,44" fill="#ffffff" />
</svg>`
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg)

// 2. Generate PNG icons
const sizes = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
]

for (const { file, size } of sizes) {
  const pngBuf = generatePng(size)
  fs.writeFileSync(path.join(publicDir, file), pngBuf)
}

console.log('Trainyy PWA icons successfully generated in public/ folder!')

