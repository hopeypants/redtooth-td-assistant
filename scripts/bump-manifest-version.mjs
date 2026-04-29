/**
 * Increments patch version before each production build and keeps
 * `manifest.json` + `package.json` versions in sync.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'manifest.json')
const packagePath = join(root, 'package.json')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))

function parseVersion(v) {
  const parts = String(v ?? '0.0.0')
    .split('.')
    .map((s) => parseInt(s.trim(), 10))
  while (parts.length < 3) parts.push(0)
  return parts.slice(0, 3).map((n) => (Number.isNaN(n) ? 0 : n))
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1
    if (a[i] < b[i]) return -1
  }
  return 0
}

const manifestParts = parseVersion(manifest.version)
const packageParts = parseVersion(pkg.version)
const base =
  compareSemver(manifestParts, packageParts) >= 0
    ? [...manifestParts]
    : [...packageParts]
base[2] += 1
const next = `${base[0]}.${base[1]}.${base[2]}`

manifest.version = next
pkg.version = next
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
console.log(`[bump-version] manifest + package → ${next}`)
