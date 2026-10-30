// src/utils/remanentes.js — ODS 12 / Meta 12.3: liberación de raciones remanentes.
//
// Cuando el pronóstico del día (votos "Sí") supera lo realmente servido, esa
// brecha son raciones ya preparadas que, si nadie las aprovecha, terminan en el
// desperdicio. Este módulo calcula el remanente estimado y lo traduce a:
//   - raciones que aún pueden liberarse por orden de llegada,
//   - kilos de comida rescatada del desperdicio directo,
//   - el mensaje listo para notificar al grupo de estudiantes vía Telegram.

/**
 * Raciones estimadas como remanentes: las que el pronóstico prometió y que aún
 * están disponibles para liberar. Solo hay remanente si el pronóstico superó
 * lo servido (si no, todo se agotó y no se libera nada).
 * @param {number} votosSi    votos "Sí" de hoy servidos como pronóstico
 * @param {number} raciones   raciones realmente servidas hoy
 * @returns {number} remanentes estimados (0 si no hay excedente)
 */
export function remanentesEstimados(votosSi, raciones) {
  const v = Math.max(0, Number(votosSi) || 0)
  const r = Math.max(0, Number(raciones) || 0)
  return Math.max(0, Math.round(v - r))
}

/**
 * Kilos de comida rescatados del desperdicio directo gracias a la liberación
 * de remanentes (cada ración liberada pesa ~kgPorRacion).
 * @param {number} remanentes  raciones liberadas como remanentes
 * @param {number} kgPorRacion kilos promedio por ración (default 0.5 kg)
 */
export function kgRescatadosRemanentes(remanentes, kgPorRacion = 0.5) {
  const n = Math.max(0, Number(remanentes) || 0)
  const kg = Math.max(0, Number(kgPorRacion) || 0)
  return Math.round(n * kg * 100) / 100
}

/**
 * Construye el mensaje de Telegram para notificar la liberación de remanentes.
 * Devuelve el texto listo para enviar al grupo de estudiantes.
 * @param {object} opts { servicio, manana|cantidad, horaFin }
 * @returns {string}
 */
export function mensajeTelegramRemanentes({ servicio = 'a', cantidad, horaFin, kgRescatados } = {}) {
  const nombreServicio = servicio === 'c' ? 'Cena' : 'Almuerzo'
  const raciones = Math.max(0, Number(cantidad) || 0)
  const kg = kgRescatados != null ? Number(kgRescatados) : kgRescatadosRemanentes(raciones)
  return [
    '📢 ¡RACIONES REMANENTES DISPONIBLES!',
    `Servicio: ${nombreServicio}`,
    `Quedan aproximadamente ${raciones} raciones disponibles por orden de llegada.`,
    `⏰ Horario límite de atención: hasta las ${horaFin}.`,
    `⚠️ Requisito: presentar carnet físico con QR en el mesón. Solo estudiantes que aún no han comido hoy.`,
    kg > 0 ? `♻️ Son ≈ ${kg} kg de comida rescatada del desperdicio (ODS 12).` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Evalúa si hoy se liberan remanentes y construye el estado completo del envío.
 * Devuelve null si no hay remanentes (nada que notificar).
 * @param {number} votosSi  pronóstico de hoy en raciones
 * @param {number} raciones raciones servidas hoy
 * @param {object} opts { servicio, horaFin, kgPorRacion }
 * @returns {null|{remanentes, kgRescatados, mensaje, servicio, horaFin}}
 */
export function estadoLiberacionRemanentes(votosSi, raciones, { servicio = 'a', horaFin = '', kgPorRacion = 0.5 } = {}) {
  const remanentes = remanentesEstimados(votosSi, raciones)
  if (remanentes <= 0) return null
  const kgRescatados = kgRescatadosRemanentes(remanentes, kgPorRacion)
  const mensaje = mensajeTelegramRemanentes({ servicio, cantidad: remanentes, horaFin, kgRescatados })
  return { remanentes, kgRescatados, mensaje, servicio, horaFin }
}

/** Coordina que el escaneo en el mesón acepte accesos por remanentes (ya liberados). */
export function esAccesoPorRemanentes(servicio, remanentesActivos, fecha) {
  const activos = remanentesActivos?.[fecha]?.[servicio]
  return Boolean(activos && activos.activo === true && Number(activos.cantidad) > 0)
}

// ── Coordinador de liberación (bloqueo anti-reenvío de 10 minutos) ──
//
// Evita notificar al grupo cada vez que se abre el mesón: una vez liberados
// los remanentes, el reenvío queda bloqueado 10 minutos (tiempo de sobra para
// que los estudiantes lleguen al mesón y los carnéts se escaneen por orden de
// llegada). Usa localStorage con fallback en memoria, igual que
// offlineSyncService, así funciona también sin red o en tests (Node/jsdom).

const K_BLOQUEO_REENVIO = 'beca_comedor_bloqueo_remanentes'

// Fallback en memoria cuando localStorage no está disponible (tests sin
// --localstorage-file, SSR, workers). Mismo patrón que offlineSyncService.
const memoriaReenvios = new Map()

function storageRemanentes() {
  try {
    if (typeof localStorage !== 'undefined') {
      const k = '__beca_comedor_probe__'
      localStorage.setItem(k, '1')
      localStorage.removeItem(k)
      return localStorage
    }
  } catch (_) { /* fallback a memoria */ }
  return {
    getItem: (key) => (memoriaReenvios.has(key) ? String(memoriaReenvios.get(key)) : null),
    setItem: (key, value) => { memoriaReenvios.set(key, String(value)) },
    removeItem: (key) => { memoriaReenvios.delete(key) },
  }
}

/** Duración del bloqueo anti-reenvío: 10 minutos en ms. */
export const BLOQUEO_REENVIO_MS = 10 * 60 * 1000

/**
 * Lee el timestamp (epoch ms) de la última liberación liberada para `fecha`.
 * @returns {number} 0 si nunca se liberó remanentes ese día
 */
export function ultimaLiberacionRemanentes(fecha) {
  const raw = storageRemanentes().getItem(`${K_BLOQUEO_REENVIO}_${fecha}`)
  return Number(raw) || 0
}

/** ¿Ya pasaron los 10 min de bloqueo y se puede volver a liberar? */
export function puedeLiberarRemanentes(fecha, ahora = Date.now()) {
  const ultima = ultimaLiberacionRemanentes(fecha)
  if (!ultima) return true // nunca se liberó: se puede
  return ahora - ultima >= BLOQUEO_REENVIO_MS
}

/** Milisegundos que faltan para que termine el bloqueo (0 si ya pasó). */
export function msParaReintentoRemanentes(fecha, ahora = Date.now()) {
  const ultima = ultimaLiberacionRemanentes(fecha)
  if (!ultima) return 0
  return Math.max(0, BLOQUEO_REENVIO_MS - (ahora - ultima))
}

/** Registra la liberación de hoy (inicia el bloqueo de 10 min). */
export function registrarLiberacionRemanentes(fecha, ahora = Date.now()) {
  storageRemanentes().setItem(`${K_BLOQUEO_REENVIO}_${fecha}`, String(ahora))
}

/**
 * Coordina una liberación de remanentes respetando el bloqueo anti-reenvío.
 * Si está bloqueado devuelve el estado de espera; si no, ejecuta `relanzar` y
 * registra la liberación. Útil para envolver el envío a Telegram del mesón.
 * @param {string} fecha     fecha (YYYY-MM-DD) sobre la que se libera
 * @param {Function} relanzar async que hace el envío real (p.ej. a Telegram)
 * @param {number} ahora     timestamp de referencia (testeable, default Date.now)
 * @returns {Promise<{ok:boolean, liberado:boolean, bloqueadoHasta?:number, msFaltantes:number, resultado?:*}>}
 */
export async function coordinadorLiberacion(fecha, relanzar, ahora = Date.now()) {
  if (!puedeLiberarRemanentes(fecha, ahora)) {
    const msFaltantes = msParaReintentoRemanentes(fecha, ahora)
    return { ok: false, liberado: false, bloqueadoHasta: ultimaLiberacionRemanentes(fecha) + BLOQUEO_REENVIO_MS, msFaltantes }
  }
  const resultado = await relanzar()
  registrarLiberacionRemanentes(fecha, ahora)
  return { ok: true, liberado: true, msFaltantes: 0, resultado }
}
