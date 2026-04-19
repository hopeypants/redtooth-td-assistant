/**
 * Resize/compress the master poker chip PNG into extension icon sizes.
 * Run after replacing icons/icon128.png with a new source image.
 *
 * Applies a circular alpha mask so square/dark canvas corners become transparent
 * (toolbar + favicon look correct on any background).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcPath = join(root, 'icons', 'icon128.png')
const sizes = [16, 24, 32, 48, 128]

/**
 * Set alpha to 0 outside an inscribed circle (removes square backdrop).
 */
async function applyCircularTransparency(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  const R = Math.min(w, h) / 2 - 0.25
  const R2 = R * R

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      const dy = y - cy
      const i = (y * w + x) * 4
      if (dx * dx + dy * dy > R2) {
        data[i + 3] = 0
      }
    }
  }

  return sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
}

const buf = await readFile(srcPath)
const withAlpha = await applyCircularTransparency(buf)

const out = await Promise.all(
  sizes.map(async (size) => {
    const png = await sharp(withAlpha)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer()
    return { size, png }
  }),
)

for (const { size, png } of out) {
  await writeFile(join(root, 'icons', `icon${size}.png`), png)
}
