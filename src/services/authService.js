import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'
import { api, pollQuery } from './firestoreRest'

/** Suscribirse al estado de autenticación. cb(user|null) */
export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb)
}

/** Suscribirse al rol del usuario (doc admins/{uid}) por sondeo. */
export function watchRole(uid, cb) {
  return pollQuery(async () => (await api.getDoc(`admins/${uid}`)) || null, cb, 5000)
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  await signOut(auth)
}