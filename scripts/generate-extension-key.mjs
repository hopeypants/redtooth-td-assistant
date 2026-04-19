/**
 * Generates a stable RSA key pair so unpacked dev builds get the same extension ID
 * on every machine (manifest "key" field). Run once:
 *   node scripts/generate-extension-key.mjs
 * Then paste the printed "key" into manifest.json. Keeps extension-dev-private.pem
 * (gitignored) for optional .crx packing — do not commit the PEM.
 */
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pemPath = join(root, 'extension-dev-private.pem')

if (existsSync(pemPath)) {
  console.error(
    'extension-dev-private.pem already exists. Remove it first if you want a new key.',
  )
  process.exit(1)
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

writeFileSync(pemPath, privateKey, { mode: 0o600 })

const keyB64 = Buffer.from(publicKey).toString('base64')
console.log('--- Add this single line to manifest.json (inside the top-level object): ---')
console.log('"key": "' + keyB64 + '"')
console.log('--- Private key written to extension-dev-private.pem (keep local; do not commit). ---')
