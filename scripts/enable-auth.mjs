import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'
const store = JSON.parse(readFileSync(join(homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'))
const projectId = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default

async function token() {
  if (store.tokens.access_token && store.tokens.expires_at > Date.now() + 60_000) return store.tokens.access_token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: store.tokens.refresh_token,
      grant_type: 'refresh_token',
      redirect_uri: 'http://localhost',
    }),
  })
  const data = await res.json()
  return data.access_token
}

const t = await token()

// Habilitar Email/Contraseña
const authRes = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.email.enabled`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
  body: JSON.stringify({ signIn: { email: { enabled: true } } }),
})
console.log('auth config:', authRes.status, (await authRes.text()).slice(0, 200))

// Verificar bucket de Storage
const bucket = `${projectId}.firebasestorage.app`
const bres = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}`, { headers: { Authorization: `Bearer ${t}` } })
console.log('storage bucket:', bres.status, (await bres.text()).slice(0, 120))