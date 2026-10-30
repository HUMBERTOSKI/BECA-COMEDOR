// src/services/offlineSyncService.js — Offline-First para el escáner (mesón/recepción).
//
// Validación local instantánea contra un caché en localStorage + cola de
// sincronización en segundo plano que sube las asistencias cuando vuelve la red.
// Las escrituras en Firestore siguen ocurriendo SOLO vía el Worker (/validate),
// con la clave idempotente `{fecha}_{studentId}` → sin documentos duplicados.

import { decodeQr, encodeQr } from '../utils/qr'
import { todayISO } from '../utils/dates'

const K_STUDENTS = 'beca_cache_students'
const K_QUEUE = 'beca_sync_queue'
const K_ATT = (fecha) => `beca_cache_attendance_${fecha}`
const RETRY_MS = 5000
const BATCH_MS = 1200
const MAX_QUEUE = 1000

// ---------- Estado del módulo (singleton desacoplado) ----------

const listeners = new Set()
let online = typeof navigator !== 'undefined' ? navigator.onLine : true
let syncing = false
let clientRef = null
let batchTimer = null
let retryTimer = null
let netBound = false

// Restos (test/storage raro): si no hay localStorage, usamos un mapa en memoria
// (misma API) para que el módulo funcione en cualquier entorno sin estallar.
// ------------------- Almacenamiento con respaldo -------------------
// En entornos sin localStorage (o con uno roto/inaccesible, p.ej. jsdom sin
// `--localstorage-file`), TODO cae a un mapa en memoria con la misma API
// (Storage), para que el módulo nunca estalle y las pruebas sean estables.

const memCache = new Map()
const memStore = {
  getItem(k) { return memCache.has(k) ? memCache.get(k) : null },
  setItem(k, v) { memCache.set(k, String(v)) },
  removeItem(k) { memCache.delete(k) },
  key(i) { return i < memCache.size ? Array.from(memCache.keys())[i] : null },
  get length() { return memCache.size },
  clear() { memCache.clear() },
}

const cacheKeys = new Set()
let storageCandidate = null
let storageProbed = false

function storage() {
  if (storageProbed) return storageCandidate
  storageProbed = true
  storageCandidate = pickStorage()
  return storageCandidate
}

/**
 * Elige el almacén real SOLO si sus operaciones funcionan de verdad. Si no hay
 * localStorage (o está roto), se usa el mapa en memoria de respaldo.
 */
function pickStorage() {
  if (typeof localStorage === 'undefined' || localStorage == null) return memStore
  try {
    const k = '__beca_probe__'
    localStorage.setItem(k, '1')
    localStorage.getItem(k)
    localStorage.removeItem(k)
    return localStorage
  } catch {
    return memStore
  }
}

// ---------- Acceso a localStorage ----------

function readJSON(key, fallback) {
  try {
    const raw = storage().getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  cacheKeys.add(key)
  try {
    storage().setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Limpia TODO el caché offline y la cola (usado en pruebas y "Empezar de cero").
 * Borra tanto el localStorage real como el almacén en memoria de respaldo.
 */
export function resetOfflineCache() {
  if (batchTimer) { clearTimeout(batchTimer); batchTimer = null }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  syncing = false
  for (const key of Array.from(cacheKeys)) {
    try { storage().removeItem(key) } catch { /* secundario */ }
    try { memStore.removeItem(key) } catch { /* secundario */ }
  }
  cacheKeys.clear()
  emit()
}

const readStudents = () => readJSON(K_STUDENTS, {})
const readQueue = () => readJSON(K_QUEUE, [])
const writeQueue = (q) => writeJSON(K_QUEUE, q)
const readAttendance = (fecha) => readJSON(K_ATT(fecha), [])
const writeAttendance = (fecha, list) => writeJSON(K_ATT(fecha), list)

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------- Notificación de estado ----------

export function getSyncStatus() {
  return { isOnline: online, isSyncing: syncing, pendingCount: readQueue().length }
}

function emit() {
  const data = getSyncStatus()
  listeners.forEach((cb) => {
    try { cb(data) } catch { /* el suscriptor no rompe el módulo */ }
  })
}

function onOnline() {
  online = true
  emit()
  scheduleSync(300)
}

function onOffline() {
  online = false
  emit()
}

// Los listeners de red se enlazan al cargar el módulo (no solo al suscribirse),
// para que los eventos `online`/`offline` cambien el estado incluso sin suscriptores.
if (typeof window !== 'undefined' && !netBound) {
  netBound = true
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
}

/**
 * Suscribirse a cambios de conectividad/cola.
 * Devuelve función para desuscribirse.
 */
export function subscribeSyncStatus(callback) {
  listeners.add(callback)
  if (typeof window !== 'undefined' && !netBound) {
    netBound = true
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  }
  callback(getSyncStatus())
  return () => listeners.delete(callback)
}

// ---------- Cola de sincronización ----------

function scheduleSync(delay = BATCH_MS) {
  if (batchTimer) return
  batchTimer = setTimeout(() => {
    batchTimer = null
    syncPendingQueue()
  }, delay)
}

function enqueue(record) {
  const queue = [...readQueue(), record]
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
  writeQueue(queue)
  emit()
  if (online && !syncing) scheduleSync()
}

/** Registra el cliente de red usado por la cola (normalmente { validate: validateScan }). */
export function setSyncClient(wc) {
  clientRef = wc
}

/**
 * Sube los registros pendientes (si hay red). El worker confirma la asistencia
 * de forma idempotente (`{fecha}_{studentId}`); cualquier respuesta del servidor
 * resuelve el ítem, y solo un fallo de red lo conserva para reintentar en 5 s.
 */
export async function syncPendingQueue(wc = clientRef) {
  if (syncing) return
  if (!wc || typeof wc.validate !== 'function') return
  let queue = readQueue()
  if (!queue.length) {
    emit()
    return
  }
  if (!online) return

  syncing = true
  emit()
  try {
    while (queue.length) {
      if (!online) break
      const rec = queue[0]
      rec.syncAttempts = (rec.syncAttempts || 0) + 1
      try {
        await wc.validate(encodeQr(rec.studentId))
        queue = queue.slice(1)
        writeQueue(queue)
      } catch {
        // Fallo de red/timeout: conservamos la cola y cortamos la ráfaga.
        break
      }
    }
    writeQueue(queue)
  } finally {
    syncing = false
    emit()
    if (queue.length && online) retryTimer = setTimeout(() => { retryTimer = null; syncPendingQueue() }, RETRY_MS)
  }
}

// ---------- Caché offline ----------

/**
 * Refresco inicial del caché (al abrir la app con red).
 * Fusiona (no pisa) lo que ya había guardado.
 */
export function initOfflineCache({ date, students, attendances } = {}) {
  if (!date) return

  if (Array.isArray(students) && students.length) {
    const map = { ...readStudents() }
    for (const s of students) {
      if (!s || !s.id) continue
      map[s.id] = {
        nombre: s.nombre || '',
        ci: s.ci || '',
        ru: s.ru || '',
        carrera: s.carrera || '',
        foto: s.foto || null,
        activo: s.activo !== false,
      }
    }
    const ok = writeJSON(K_STUDENTS, map)
    if (!ok) {
      // Cuota: guardamos sin fotos antes de renunciar al caché.
      const light = {}
      for (const [id, s] of Object.entries(map)) light[id] = s ? { ...s, foto: null } : s
      writeJSON(K_STUDENTS, light)
    }
  }

  if (Array.isArray(attendances)) {
    const set = new Set(readAttendance(date))
    for (const a of attendances) if (a && a.studentId) set.add(a.studentId)
    writeAttendance(date, Array.from(set))
  }

  emit()
}

/**
 * Valida localmente (sin red, < 50 ms):
 *  - estudiante desconocido / inactivo
 *  - bloqueo inmediato de duplicados del día (`ya_comio`)
 *  - aprobación: marca la asistencia local y encola la sincronización
 */
export function validateLocally(qrPayload, date = todayISO()) {
  const studentId = decodeQr(qrPayload)
  if (!studentId) return { status: 'no_registrado' }

  const cached = readStudents()[studentId]
  if (!cached) return { status: 'no_registrado' }

  const student = {
    nombre: cached.nombre || '',
    ci: cached.ci || '',
    ru: cached.ru || '',
    carrera: cached.carrera || '',
    foto: cached.foto || null,
  }

  if (cached.activo === false) return { status: 'inactivo', student }

  const set = new Set(readAttendance(date))
  if (set.has(studentId)) return { status: 'ya_comio', student }

  set.add(studentId)
  writeAttendance(date, Array.from(set))

  enqueue({
    id: newId(),
    fecha: date,
    studentId,
    timestamp: new Date().toISOString(),
    syncAttempts: 0,
  })

  return { status: 'ok', student, offline: true }
}