import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const certJson = JSON.parse(readFileSync(join(root, 'firebase-service-account.json'), 'utf8'))
const app = initializeApp({ credential: cert(certJson) })
const db = getFirestore(app, 'default')

const fecha = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10)
await db.doc(`menus/${fecha}`).set({
  estado: 'borrador',
  platillos: ['Silpancho de pollo con arroz', 'Sopa de maní', 'Mote con huevo y queso'],
  horaLimite: '10:30',
}, { merge: true })
console.log(`Menú creado para ${fecha}`)
process.exit(0)