// Cliente REST a Firestore que evita el WebChannel del SDK (roto para la BD de
// este proyecto). Usa el ID token del usuario autenticado (las reglas aplican).

import { auth } from './firebase'

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID
const DB = 'default'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB}/documents`

async function idToken() {
  const u = auth.currentUser
  if (!u) throw new Error('Sin sesión')
  return (await u.getIdToken()) || ''
}

async function request(path, init = {}) {
  const token = await idToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`FS ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  return res
}

export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) < 9007199254740991) return { integerValue: String(v) }
    return { doubleValue: v }
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } }
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } }
  throw new Error('Valor no soportado: ' + typeof v)
}

export function encodeFields(obj) {
  const fields = {}
  for (const [k, val] of Object.entries(obj || {})) {
    if (val === undefined) continue
    fields[k] = encodeValue(val)
  }
  return fields
}

export function decodeValue(f) {
  if (!f) return null
  if (f.nullValue !== undefined) return null
  if (f.stringValue !== undefined) return f.stringValue
  if (f.booleanValue !== undefined) return f.booleanValue
  if (f.integerValue !== undefined) return Number(f.integerValue)
  if (f.doubleValue !== undefined) return f.doubleValue
  if (f.timestampValue !== undefined) return new Date(f.timestampValue)
  if (f.mapValue) return decodeFields(f.mapValue.fields || {})
  if (f.arrayValue) return (f.arrayValue.values || []).map(decodeValue)
  if (f.referenceValue !== undefined) return f.referenceValue
  return null
}

export function decodeFields(fields) {
  const obj = {}
  for (const [k, v] of Object.entries(fields || {})) obj[k] = decodeValue(v)
  return obj
}

async function getDoc(path) {
  const res = await request(`/${path}`)
  if (res.status === 404) return null
  const data = await res.json()
  return { id: data.name.split('/').pop(), ...decodeFields(data.fields), createTime: data.createTime, updateTime: data.updateTime }
}

async function runQuery(queryDef) {
  const res = await request('/:runQuery', {
    method: 'POST',
    body: JSON.stringify(queryDef),
  })
  const entries = await res.json()
  return (entries || [])
    .filter((e) => e.document)
    .map((e) => ({
      id: e.document.name.split('/').pop(),
      ...decodeFields(e.document.fields),
      createTime: e.document.createTime,
      updateTime: e.document.updateTime,
    }))
}

async function addDoc(path, fieldsObj) {
  const res = await request(`/${path}`, {
    method: 'POST',
    body: JSON.stringify({ fields: encodeFields(fieldsObj) }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('FS: ' + JSON.stringify(data))
  return { id: data.name.split('/').pop(), ...fieldsObj }
}

async function patchDoc(path, fieldsObj) {
  const mask = Object.keys(fieldsObj)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&')
  const res = await request(`/${path}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields(fieldsObj) }),
  })
  if (!res.ok) throw new Error('FS: ' + (await res.text()).slice(0, 200))
}

async function deleteDoc(path) {
  const res = await request(`/${path}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error('FS: ' + (await res.text()).slice(0, 200))
}

/** Consulta where(field == value) | orderBy | limit vía :runQuery. */
export async function queryDocs(collectionId, { where, orderBy, limit } = {}) {
  const from = [{ collectionId }]
  const structuredQuery = { from }
  if (where) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: 'EQUAL',
        value: encodeValue(where.value),
      },
    }
  }
  if (orderBy) {
    structuredQuery.orderBy = [
      { field: { fieldPath: orderBy.field }, direction: orderBy.direction || 'ASCENDING' },
    ]
  }
  if (limit) structuredQuery.limit = limit
  return runQuery({ structuredQuery })
}

/** Subscripción por sondeo (setInterval con getDoc/getDocs). */
export function pollQuery(fn, cb, ms = 5000) {
  let stopped = false
  let timer = null
  const tick = async () => {
    if (stopped) return
    try {
      const value = await fn()
      if (!stopped) cb(value)
    } catch (e) {
      if (!stopped) console.error('FS poll:', e.message)
    } finally {
      if (!stopped) timer = setTimeout(tick, ms)
    }
  }
  tick()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}

export const api = {
  getDoc,
  addDoc,
  patchDoc,
  deleteDoc,
  queryDocs,
  now: () => new Date(),
}