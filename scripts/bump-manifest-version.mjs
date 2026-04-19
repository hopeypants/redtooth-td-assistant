/**
 * Increments the patch segment of `manifest.json` `version` before each production build
 * so Chrome’s extension list shows a new version after `npm run build` + Reload.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'manifest.json')
const raw = readFileSync(manifestPath, 'utf8')
const manifest = JSON.parse(raw)
const parts = String(manifest.version ?? '0.0.0')
  .split('.')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => !Number.isNaN(n))
while (parts.length < 3) parts.push(0)
parts[2] = (parts[2] ?? 0) + 1
manifest.version = `${parts[0]}.${parts[1]}.${parts[2]}`
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`[bump-manifest-version] → ${manifest.version}`)
