// Cliente HTTP hacia el Backend REST en PHP (Programación Orientada a Objetos).
// Se conecta a la API POO de producción para validación en mesón, Telegram y remanentes.

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || 'http://localhost:8000'

async function post(path, body) {
  if (!API_BASE_URL) throw new Error('VITE_API_URL no configurado')
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API POO ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Valida el QR escaneado en el mesón (bloqueo anti-duplicidad incluido).
 * Devuelve: { ok: true, student: { nombre, ru, carrera, foto } }
 *        o: { ok: false, reason: 'ya_comio'|'inactivo'|'no_registrado'|'invalido' }
 */
export function validateScan(code) {
  return post('/validate', { code })
}

/** Pide al backend publicar el menú de HOY en Telegram (manual, inmediato). */
export function publicarMenuHoy() {
  return post('/publicarmenu', {})
}

/**
 * Pide al backend publicar el menú de un día concreto en Telegram (inmediato).
 * `servicio`: 'almuerzo' | 'cena' | 'ambos'.
 */
export function publicarMenuPara(fecha, servicio = 'ambos') {
  return post('/publicarmenu', { fecha, servicio })
}

/** Envía el estimado de comensales de hoy al grupo de cocina. */
export function notificarCocina() {
  return post('/notify-kitchen', {})
}

/**
 * Libera las raciones remanentes de un servicio (marca acceso + notifica a
 * Telegram). `body`: { fecha?, servicio?: 'a'|'c', horaFin?, kgPorRacion? }.
 * Devuelve { ok, motivo?, fecha, servicio, cantidad, kgRescatados, producto? }.
 */
export function liberarRemanentes(body = {}) {
  return post('/liberar-remanentes', body)
}