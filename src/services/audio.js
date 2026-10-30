// Sonidos de confirmación sin archivos: Web Audio API.

let ctx = null

function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, dur, type = 'sine', gain = 0.2) {
  const c = audioCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur)
}

/** Beep corto: asistencia válida (verde). */
export function playOk() {
  tone(880, 0, 0.12)
  tone(1320, 0.15, 0.18)
}

/** Alarma: rechazo / ya comió (rojo). */
export function playFail() {
  tone(220, 0, 0.28, 'square', 0.15)
  tone(180, 0.3, 0.28, 'square', 0.15)
  tone(150, 0.6, 0.4, 'square', 0.15)
}

/** Vitamina: estudiante registrado/confirmado en pantalla. */
export function beep() {
  tone(1000, 0, 0.06, 'sine', 0.12)
}