// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const config = {
  apiKey: 'AIzaSyBeNm3XwI4gGmuoQBT7CIVc-LZ7iapsbfU',
  authDomain: 'beca-comedor-uabjb.firebaseapp.com',
  projectId: 'beca-comedor-uabjb',
  storageBucket: 'beca-comedor-uabjb.firebasestorage.app',
  messagingSenderId: '270153747309',
  appId: '1:270153747309:web:07840ca786d8b0d18da864',
}

describe('REST real: login + rol + consultas', () => {
  it('lee el rol con GET documents/admins/{uid}', async () => {
    const app = initializeApp(config, 'rest-it')
    const auth = getAuth(app)
    const cred = await signInWithEmailAndPassword(auth, 'AdminBeca@uabjb.bo', '60227926SBh')
    const uid = cred.user.uid
    expect(uid).toBe('JNUVUI2BKBhpDWtDwQ9t8NRalU03')

    const token = await cred.user.getIdToken()
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/default/documents/admins/${uid}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(200)
    const data = await res.json()
    const fields = data.fields || {}
    const text = (v) => v?.stringValue
    expect(text(fields.rol)).toBe('admin')
    expect(fields.habilitado?.booleanValue).toBe(true)
    console.log('ROL OK:', text(fields.nombre), '| rol:', text(fields.rol), '| hab:', fields.habilitado?.booleanValue)
  }, 30000)
})