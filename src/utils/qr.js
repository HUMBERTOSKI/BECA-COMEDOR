// Codificación del QR de la credencial.
// Formato: "BECA1:<studentId>"  (studentId = doc id de Firestore, aleatorio e imposible de adivinar).

export const QR_PREFIX = 'BECA1'

export function encodeQr(studentId) {
  return `${QR_PREFIX}:${studentId}`
}

/** Devuelve el studentId y null si el QR no es válido o pertenece a otra versión. */
export function decodeQr(payload) {
  if (typeof payload !== 'string') return null
  const idx = payload.indexOf(':')
  if (idx === -1) return null
  const prefix = payload.slice(0, idx)
  if (prefix !== QR_PREFIX) return null
  const id = payload.slice(idx + 1).trim()
  return id.length >= 1 ? id : null
}