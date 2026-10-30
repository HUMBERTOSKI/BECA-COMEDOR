// Crea/actualiza un usuario del sistema y su doc en `admins/{uid}`.
//
// Rol por defecto: 'admin'. Otros roles: 'cocina' | 'recepcionista'.
//
// Uso:
//   ADMIN_EMAIL=admin@uabjb.edu.bo ADMIN_PASSWORD=unaClaveFuerte ADMIN_NAME="Nombre Admin" \
//     node scripts/seed-admin.mjs
//
//   ADMIN_EMAIL=recep@uabjb.edu.bo ADMIN_PASSWORD=unaClave ADMIN_ROLE=recepcionista \
//     node scripts/seed-admin.mjs
//
// Requiere `firebase-service-account.json` (cuenta de servicio) en la raíz del proyecto.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'Administrador'
const role = process.env.ADMIN_ROLE || 'admin'

if (!email || !password) {
  console.error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.')
  process.exit(1)
}

if (!['admin', 'cocina', 'recepcionista'].includes(role)) {
  console.error(`Rol inválido: ${role} (usa 'admin', 'cocina' o 'recepcionista').`)
  process.exit(1)
}

const certJson = JSON.parse(readFileSync(join(root, 'firebase-service-account.json'), 'utf8'))

const app = initializeApp({ credential: cert(certJson) })
const auth = getAuth(app)
const firestore = getFirestore(app, 'default')

async function main() {
  let uid
  try {
    const user = await auth.createUser({ email, password, displayName: name, emailVerified: true })
    uid = user.uid
    console.log(`✅ Usuario creado: ${email} (${uid})`)
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      const user = await auth.getUserByEmail(email)
      uid = user.uid
      await auth.updateUser(uid, { password, displayName: name, emailVerified: true })
      console.log(`♻️ Usuario existente actualizado: ${email} (${uid})`)
    } else {
      throw e
    }
  }

  await firestore.doc(`admins/${uid}`).set({
    email,
    nombre: name,
    rol: role,
    habilitado: true,
    creadoEn: FieldValue.serverTimestamp(),
  }, { merge: true })

  console.log(`✅ Doc de rol creado: admins/${uid} (rol=${role})`)
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})