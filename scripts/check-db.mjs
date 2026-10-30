import { readFileSync } from 'node:fs'

const sa = JSON.parse(readFileSync('firebase-service-account.json', 'utf8'))
const { private_key: pem, client_email } = sa

const toB64 = (s) => Buffer.from(s).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const assert = `${toB64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${toB64(JSON.stringify({
  iss: client_email,
  scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
}))}`
const { createPrivateKey, sign } = await import('node:crypto')
const key = createPrivateKey(pem)
const sig = sign('RSA-SHA256', Buffer.from(assert), key).toString('base64url')
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${assert}.${sig}` }),
})
const token = (await tokenRes.json()).access_token
console.log('token OK')

const res = await fetch('https://firestore.googleapis.com/v1/projects/beca-comedor-uabjb/databases', {
  headers: { Authorization: `Bearer ${token}` },
})
console.log('databases status:', res.status)
console.log((await res.text()).slice(0, 800))