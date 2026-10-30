// Capa de acceso a datos sobre Firestore vía REST (el WebChannel del SDK no es
// usable con la BD de este proyecto). La API pública se conserva intacta para
// no tocar los componentes.

import { api, queryDocs, pollQuery, encodeValue } from './firestoreRest'

const ns = (coll) => `${coll}`

// ---------- Estudiantes ----------

export function watchStudents(cb) {
  return pollQuery(() => queryDocs(ns('students'), { orderBy: { field: 'nombre' } }), cb, 5000)
}

/** Todos los estudiantes en una sola lectura (usado para el caché offline). */
export async function getStudents() {
  return queryDocs(ns('students'), { orderBy: { field: 'nombre' } })
}

export async function getStudent(id) {
  return api.getDoc(`students/${id}`)
}

/** Crea un estudiante y devuelve { id, ... }. */
export async function addStudent(data) {
  return api.addDoc('students', { ...data, activo: true, creadoEn: api.now() })
}

export async function updateStudent(id, data) {
  await api.patchDoc(`students/${id}`, { ...data, actualizadoEn: api.now() })
}

export async function setStudentActive(id, activo) {
  await api.patchDoc(`students/${id}`, { activo })
}

export async function setStudentTelegram(id, telegramUserId) {
  await api.patchDoc(`students/${id}`, { telegramUserId: telegramUserId || null })
}

export async function removeStudentPhoto(id) {
  await api.patchDoc(`students/${id}`, { foto: null })
}

// ---------- Menús ----------

export async function getMenu(fecha) {
  return api.getDoc(`menus/${fecha}`)
}

export async function setMenu(fecha, data) {
  await api.patchDoc(`menus/${fecha}`, {
    fecha,
    platillos: [],
    platillosCena: [],
    feriado: false,
    descripcion: '',
    horaLimite: '10:30',
    estado: 'borrador',
    ...data,
    actualizadoEn: api.now(),
  })
}

export function watchMenus(cb, limit = 30) {
  return pollQuery(
    () =>
      queryDocs(ns('menus'), { orderBy: { field: 'fecha', direction: 'DESCENDING' }, limit }).then((docs) => docs.slice(0, limit)),
    cb,
    5000,
  )
}

// ---------- Envíos programados de menús ----------

/** Agenda la publicación de un menú para un instante concreto (Date). */
export async function agendarEnvio(fecha, enviarEn, servicio = 'ambos') {
  return api.addDoc('envios', { fecha, enviarEn, servicio, estado: 'pendiente', creadoEn: api.now() })
}

export function watchEnvios(cb) {
  return pollQuery(() => queryDocs(ns('envios'), { orderBy: { field: 'enviarEn' }, limit: 60 }), cb, 5000)
}

export async function cancelarEnvio(id) {
  await api.deleteDoc(`envios/${id}`)
}

// ---------- Votos (solo lectura por el cliente) ----------

export function watchVotesForDate(fecha, cb) {
  return pollQuery(() => queryDocs(ns('votes'), { where: { field: 'fecha', value: fecha } }), cb, 5000)
}

export async function getVotesForDate(fecha) {
  return queryDocs(ns('votes'), { where: { field: 'fecha', value: fecha } })
}

// ---------- Asistencia (solo lectura por el cliente) ----------

export async function getAttendanceForDate(fecha) {
  return queryDocs(ns('attendance'), { where: { field: 'fecha', value: fecha } })
}

export function watchAttendanceForDate(fecha, cb) {
  return pollQuery(() => queryDocs(ns('attendance'), { where: { field: 'fecha', value: fecha } }), cb, 5000)
}

// ---------- Config (kg/ración, margen, etc.) ----------

export async function getConfig() {
  return (await api.getDoc('config/general')) || {}
}

export async function setConfig(partial) {
  await api.patchDoc('config/general', { kgPorRacion: 0.5, margenSeguridad: 0, ...partial })
}

export function watchConfig(cb) {
  return pollQuery(async () => (await api.getDoc('config/general')) || {}, cb, 5000)
}

// Compat para consumidores que usen encoders del SDK.
export { encodeValue }