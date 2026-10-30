// src/utils/camera.js — Selección de cámara (frontal/trasera) para el escáner de QR.

const BACK_RE = /(back|rear|tr[áa]s|posterior|environment)/i
const FRONT_RE = /(front|user|delanter[ao]?|selfie)/i

/** Clasifica una etiqueta de cámara como 'front', 'back' o null (desconocida). */
export function classifyCamera(label) {
  const l = String(label || '').toLowerCase()
  if (BACK_RE.test(l)) return 'back'
  if (FRONT_RE.test(l)) return 'front'
  return null
}

/**
 * Elige el dispositivo a usar según el modo pedido ('front'|'back').
 * Devuelve el deviceId (string) si hay cámaras disponibles; si no, un
 * MediaTrackConstraints `{ facingMode }` como respaldo.
 */
export function pickCameraDevice(cameras, mode) {
  const list = Array.isArray(cameras) && cameras.length ? cameras : null
  if (!list) return { facingMode: mode === 'front' ? 'user' : 'environment' }

  const match = list.find((c) => classifyCamera(c && c.label) === mode)
  if (match) return match.id

  const idx = mode === 'front' ? 0 : list.length > 1 ? 1 : 0
  return list[idx] && list[idx].id
    ? list[idx].id
    : { facingMode: mode === 'front' ? 'user' : 'environment' }
}

/** Hay más de una cámara → el toggle frontal/trasera tiene sentido. */
export function canSwitchCamera(cameras) {
  return Array.isArray(cameras) && cameras.length > 1
}