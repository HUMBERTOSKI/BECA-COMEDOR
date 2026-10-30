// worker/meson.js — Módulo MESÓN (pantalla verde de validación)
//
// Validación del QR escaneado en el comedor con bloqueo anti-duplicidad atómico:
//   - Decodifica el código QR al id del estudiante
//   - Verifica que exista y esté activo
//   - Marca la asistencia del día (id del documento = `<fecha>_<studentId>`),
//     así un segundo escaneo no puede duplicar el servicio.
//
// La lógica es idéntica a la que estaba en el worker monolítico.

import { decodeQr } from '../src/utils/qr.js';
import { fsGet, fsCreate, todayBolivia } from './core.js';

async function validate(env, code) {
  const studentId = decodeQr(code);
  if (!studentId) return { ok: false, reason: 'qr_invalido' };

  const campo = await fsGet(env, `students/${encodeURIComponent(studentId)}`);
  if (!campo) return { ok: false, reason: 'no_registrado' };
  if (campo.activo?.booleanValue === false) return { ok: false, reason: 'inactivo' };

  const fecha = todayBolivia();
  const created = await fsCreate(env, 'attendance', `${fecha}_${studentId}`, {
    fecha: { stringValue: fecha },
    studentId: { stringValue: studentId },
    timestamp: { timestampValue: new Date().toISOString() },
  });

  if (!created) return { ok: false, reason: 'ya_comio' };

  return {
    ok: true,
    student: {
      nombre: campo.nombre?.stringValue || '',
      ci: campo.ci?.stringValue || '',
      ru: campo.ru?.stringValue || '',
      carrera: campo.carrera?.stringValue || '',
      foto: campo.foto?.stringValue || null,
    },
  };
}

export { validate };