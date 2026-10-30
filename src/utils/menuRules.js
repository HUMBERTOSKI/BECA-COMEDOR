// Reglas de servicio del comedor (compartidas entre el panel y el worker).
//
//   Almuerzo : 12:00–14:00, de lunes a domingo.
//   Cena     : 18:00–19:00, de lunes a viernes.
//   Sábado   : la cena es para llevar (se entrega junto al almuerzo).
//   Domingo  : no se sirve cena.
//   Feriado  : toggle que combina almuerzo y cena en un solo servicio.

export const HORARIO_ALMUERZO = '12:00–14:00'
export const HORARIO_CENA = '18:00–19:00'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Día de la semana a partir de YYYY-MM-DD (0=domingo … 6=sábado). */
export function diaSemana(iso) {
  if (!iso) return -1
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const esDomingo = (iso) => diaSemana(iso) === 0
export const esSabado = (iso) => diaSemana(iso) === 6

/** ¿Hay cena este día? De lunes a sábado (el sábado es para llevar; el domingo no). */
export function tieneCena(iso) {
  const d = diaSemana(iso)
  return d >= 1 && d <= 6
}

/** ¿La cena de este día se sirve para llevar? (sábados). */
export function cenaEsParaLlevar(iso) {
  return esSabado(iso)
}

export function nombreDia(iso) {
  const d = diaSemana(iso)
  return d >= 0 ? DIAS[d] : ''
}

/** Fecha larga en español: "Miércoles 16 de septiembre". */
export function nombreFecha(iso) {
  const d = diaSemana(iso)
  const [, m, day] = iso.split('-').map(Number)
  return `${DIAS[d]} ${day} de ${MESES[m - 1]}`
}

/** Resumen legible de los servicios del día (para el panel). */
export function serviciosDelDia(iso) {
  if (esDomingo(iso)) return 'Almuerzo 12:00–14:00 · Sin cena (domingo)'
  if (esSabado(iso)) return 'Almuerzo 12:00–14:00 · Cena para llevar (18:00–19:00)'
  return 'Almuerzo 12:00–14:00 · Cena 18:00–19:00'
}