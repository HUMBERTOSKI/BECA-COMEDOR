// Cliente HTTP hacia el Cloudflare Worker (Telegram + validación de despacho).

const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''

async function post(path, body) {
  if (!WORKER_URL) throw new Error('VITE_WORKER_URL no configurado')
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Worker ${res.status}: ${text}`)
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

/** Pide al worker publicar el menú de HOY en Telegram (manual, inmediato). */
export function publicarMenuHoy() {
  return post('/publicarmenu', {})
}

/**
 * Pide al worker publicar el menú de un día concreto en Telegram (inmediato).
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