// Crea/actualiza releases de Firebase Rules usando la sesión del usuario (owner)
// leída de ~/.config/configstore/firebase-tools.json.
// Uso: node scripts/deploy-rules-user.mjs

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HTTP_ORIGIN = 'http://localhost'
const CLIENT_ID = process.env.FBTOOLS_CLIENT_ID || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = process.env.FBTOOLS_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi'

const configPath = process.env.FIREBASE_TOOLS_CONFIG || join(homedir(), '.config', 'configstore', 'firebase-tools.json')
const store = JSON.parse(readFileSync(configPath, 'utf8'))
const projectId = JSON.parse(readFileSync(join(process.cwd(), '.firebaserc'), 'utf8')).projects.default

async function userAccessToken() {
  const { refresh_token } = store.tokens
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
      redirect_uri: HTTP_ORIGIN,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('refresh falló: ' + JSON.stringify(data))
  return data.access_token
}

const token = await userAccessToken()

async function upsertRelease(serviceName, sourceFile, releaseId) {
  const source = readFileSync(join(process.cwd(), sourceFile), 'utf8')
  const ruleset = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source: { files: [{ name: sourceFile, content: source }] } }),
  })
  const rs = await ruleset.json()
  if (!ruleset.ok) throw new Error(`ruleset ${ruleset.status}: ${JSON.stringify(rs).slice(0, 300)}`)

  const releasePath = `projects/${projectId}/releases/${releaseId}`
  let rel = await fetch(`https://firebaserules.googleapis.com/v1/${releasePath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ updateMask: 'rulesetName', release: { name: releasePath, rulesetName: rs.name } }),
  })
  if (rel.status === 404) {
    rel = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: releasePath, rulesetName: rs.name }),
    })
  }
  if (!rel.ok) throw new Error(`release ${rel.status}: ${(await rel.text()).slice(0, 300)}`)
  console.log(`✅ ${serviceName} -> ${rs.name}`)
}

await upsertRelease('Firestore', 'firestore.rules', 'cloud.firestore')
// La BD de este proyecto se llama literalmente `default` (nueva nomenclatura).
// EL BACKEND LA GOBIERNA POR LA RELEASE cloud.firestore/default (con barra),
// creada automáticamente al provisionar la BD. Las claves cloud.firestore.* con
// punto no son evaluadas para esta BD.
await upsertRelease('Firestore (BD default)', 'firestore.rules', 'cloud.firestore/default')

const arg = process.argv.find((a) => a.startsWith('--bucket='))
const bucket = (arg ? arg.split('=')[1] : `${projectId}.firebasestorage.app`).replace(/^gs:\/\//, '')
try {
  await upsertRelease('Storage', 'storage.rules', `firebase.storage/${bucket}`)
} catch (e) {
  console.warn(`ℹ️  Sin reglas de Storage (no se usa): ${e.message}`)
}