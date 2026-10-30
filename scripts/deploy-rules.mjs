// Despliega las reglas de Firestore (release cloud.firestore) y Storage
// (firebase.storage/<bucket>) usando la cuenta de servicio.
//
// Uso: node scripts/deploy-rules.mjs [--bucket gs://beca-comedor-uabjb.firebasestorage.app]

import { readFileSync } from 'node:fs'
import { createPrivateKey, sign } from 'node:crypto'

const root = new URL('..', import.meta.url).pathname
const sa = JSON.parse(readFileSync(root + 'firebase-service-account.json', 'utf8'))
const pem = sa.private_key

const toB64 = (s) => Buffer.from(s).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const assert = `${toB64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${toB64(JSON.stringify({
  iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
}))}`
const key = createPrivateKey(pem)
const sig = sign('RSA-SHA256', Buffer.from(assert), key).toString('base64url')
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${assert}.${sig}` }),
})
const token = (await tokenRes.json()).access_token
if (!token) throw new Error('No OAuth token')

async function deployRules(serviceName, sourceFile, releaseNameKey) {
  const source = readFileSync(root + sourceFile, 'utf8')
  const resp = await fetch(`https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/rulesets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source: { files: [{ name: sourceFile, content: source }] } }),
  })
  const rs = await resp.json()
  if (!resp.ok) throw new Error(`ruleset ${resp.status}: ${JSON.stringify(rs).slice(0, 300)}`)

  const releaseName = `projects/${sa.project_id}/releases/${releaseNameKey}`
  // Actualiza si existe (PATCH); si no, crea (POST).
  let rel = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/releases/${releaseNameKey}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ updateMask: 'rulesetName', release: { name: releaseName, rulesetName: rs.name } }),
    },
  )
  if (rel.status === 404) {
    rel = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/releases`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: releaseName, rulesetName: rs.name }),
      },
    )
  }
  if (!rel.ok) throw new Error(`release ${rel.status}: ${(await rel.text()).slice(0, 300)}`)
  console.log(`✅ ${serviceName} → ${rs.name}`)
}

// Firestore: release cloud.firestore
await deployRules('Firestore', 'firestore.rules', 'cloud.firestore')

// Storage: release firebase.storage/<bucket> (sin "gs://")
const arg = process.argv.find((a) => a.startsWith('--bucket='))
const bucket = (arg ? arg.split('=')[1] : `${sa.project_id}.firebasestorage.app`).replace(/^gs:\/\//, '')
try {
  await deployRules('Storage', 'storage.rules', `firebase.storage/${bucket}`)
} catch (e) {
  console.warn(`⚠️  Storage: ${e.message}`)
  console.warn('   Si el bucket no existe, actívalo en consola (Build → Storage → Comenzar).')
}