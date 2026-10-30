import { readFileSync, existsSync } from 'node:fs'

const URL = process.env.WORKER_URL || 'https://beca-comedor-telegram.humbertorellano6abril.workers.dev'

const tokenEstudiantes =
  process.env.BOT_TOKEN ||
  (existsSync('.bot-token') ? readFileSync('.bot-token', 'utf8').trim() : '')

const tokenCocina =
  process.env.BOT_TOKEN_COCINA ||
  (existsSync('.bot-token-cocina') ? readFileSync('.bot-token-cocina', 'utf8').trim() : '')

const secretEstudiantes = existsSync('.webhook-secret')
  ? readFileSync('.webhook-secret', 'utf8').trim()
  : (process.env.WEBHOOK_SECRET || '')

const secretCocina = existsSync('.webhook-secret-cocina')
  ? readFileSync('.webhook-secret-cocina', 'utf8').trim()
  : (process.env.WEBHOOK_SECRET_COCINA || '')

const bots = [
  { nombre: 'estudiantes', token: tokenEstudiantes, secret: secretEstudiantes },
  { nombre: 'cocina', token: tokenCocina, secret: secretCocina },
]

for (const b of bots) {
  if (!b.token) {
    console.warn(`[!] Omitiendo bot ${b.nombre}: falta token (.bot-token o BOT_TOKEN)`)
    continue
  }
  const q = new URLSearchParams({ url: URL, secret_token: b.secret })
  try {
    const r = await fetch(`https://api.telegram.org/bot${b.token}/setWebhook?${q}`, {
      signal: AbortSignal.timeout(25000),
    })
    const m = await r.json()
    console.log(b.nombre, '->', m.ok ? 'OK webhook activo' : JSON.stringify(m))
  } catch (e) {
    console.log(b.nombre, '-> error', e.message)
  }
}