// Fechas en hora de Bolivia (UTC-4, sin horario de verano).
// Bolivia es UTC-4, por eso restamos 4h y leemos las componentes UTC del Date;
// así "hoy" y "hora" locales quedan correctos a cualquier hora del día.

const BOLIVIA_OFFSET_MS = -4 * 60 * 60 * 1000

export function nowInBolivia() {
  return new Date(Date.now() + BOLIVIA_OFFSET_MS)
}

/** Hoy en formato YYYY-MM-DD según hora boliviana. */
export function todayISO() {
  const d = new Date(Date.now() + BOLIVIA_OFFSET_MS)
  return d.toISOString().slice(0, 10)
}

/** Marca de tiempo actual (Date) en hora boliviana. */
export function boliviaNow() {
  return new Date()
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "lunes 12 de septiembre de 2026" a partir de YYYY-MM-DD. */
export function formatFechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${DIAS[date.getUTCDay()]} ${d} de ${MESES[m - 1]} de ${y}`
}

/** "12/09/2026" a partir de YYYY-MM-DD. */
export function formatFechaCorta(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Hora "HH:MM" boliviana a partir de timestamp de Firestore (segundos o milisegundos). */
export function formatHora(ts) {
  if (!ts) return '—'
  const d = ts instanceof Date ? ts : new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Lista de los últimos N días (incluido hoy) en formato ISO, descendente. */
export function lastDays(n) {
  const out = []
  const base = new Date(Date.now() + BOLIVIA_OFFSET_MS)
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Cuenta regresiva simple: "02:35" restantes hasta un límite "HH:MM" boliviano de hoy. */
export function minutesUntil(localHHMM) {
  const [h, m] = localHHMM.split(':').map(Number)
  const now = new Date()
  const nowLocal = new Date(now.getTime() + BOLIVIA_OFFSET_MS)
  const todayLocal = new Date(nowLocal)
  todayLocal.setUTCHours(h, m, 0, 0)
  const diffMs = todayLocal.getTime() - nowLocal.getTime()
  return Math.max(0, Math.round(diffMs / 60000))
}