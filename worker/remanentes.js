// worker/remanentes.js — Liberación de raciones remanentes (ODS 12 / Meta 12.3).
//
// Cuando el pronóstico del día (votos "Sí") supera lo realmente servido, esa
// brecha son raciones ya preparadas que, si nadie las aprovecha, terminan en el
// desperdicio directo. Este módulo:
//   1. Estima el remanente del día (cálculo puro en src/utils/remanentes.js).
//   2. Notifica al grupo de estudiantes vía Telegram (orden de llegada, hora
//      límite y requisito de carnet QR) reutilizando el mensaje construido por
//      las utilidades compartidas frontend/worker.
//   3. Registra la liberación en Firestore (`remanentes/{fecha}_{servicio}`)
//      para que el mesón siga aceptando accesos por remanentes activos.

import { sendTelegram, fsCreate, todayBolivia } from './core.js';
import {
  remanentesEstimados,
  kgRescatadosRemanentes,
  mensajeTelegramRemanentes,
  estadoLiberacionRemanentes,
} from '../src/utils/remanentes.js';

/**
 * Libera las raciones remanentes del día y notifica al grupo por Telegram.
 * Devuelve el detalle del remanente liberado (raciones y kilos rescatados).
 *
 * @param {object} env   entorno del worker (BOT_TOKEN, TELEGRAM_CHAT_ID, ...)
 * @param {object} body  { fecha, servicio: 'a'|'c', votosSi, raciones, horaFin, kgPorRacion }
 * @returns {Promise<{ok:boolean, liberado?:object, error?:string}>}
 */
export async function liberarRemanentes(env, body = {}) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(body.fecha || '')
    ? body.fecha
    : todayBolivia();
  const servicio = body.servicio === 'c' ? 'c' : 'a';
  const votosSi = Number(body.votosSi) || 0;
  const raciones = Number(body.raciones) || 0;
  const horaFin = typeof body.horaFin === 'string' && body.horaFin ? body.horaFin : '13:30';
  const kgPorRacion = Number(body.kgPorRacion) > 0 ? Number(body.kgPorRacion) : 0.5;

  const remanentes = remanentesEstimados(votosSi, raciones);
  if (remanentes <= 0) {
    return { ok: false, error: 'sin_remanentes' };
  }

  const kgRescatados = kgRescatadosRemanentes(remanentes, kgPorRacion);
  const texto = mensajeTelegramRemanentes({
    servicio,
    cantidad: remanentes,
    horaFin,
    kgRescatados,
  });

  const botToken = env.BOT_TOKEN;
  const tg = await sendTelegram(env, botToken, 'sendMessage', {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: texto,
    parse_mode: 'Markdown',
  });
  if (!tg.ok) {
    return { ok: false, error: 'telegram_fail', detalle: tg.body };
  }

  // Deja constancia en Firestore para que el mesón acepte accesos por remanentes.
  const docId = `${fecha}_${servicio}`;
  const creado = await fsCreate(env, 'remanentes', docId, {
    fecha: { stringValue: fecha },
    servicio: { stringValue: servicio },
    cantidad: { integerValue: remanentes },
    kgRescatados: { integerValue: Math.round(kgRescatados * 1000) },
    horaFin: { stringValue: horaFin },
    activo: { booleanValue: true },
    liberadoEn: { timestampValue: new Date().toISOString() },
  });

  return {
    ok: true,
    liberado: {
      fecha,
      servicio,
      cantidad: remanentes,
      kgRescatados,
      horaFin,
      credencial: `remanentes/${docId}`,
    },
  };
}

/**
 * ¿Está activa la liberación de remanentes hoy para ese servicio? El mesón lo
 * consulta en `/validate` para permitir accesos por orden de llegada mientras
 * queden raciones liberadas.
 * @param {object} env      entorno del worker
 * @param {object} env2      (no usado) mantiene firma estable
 * @param {string} fecha     YYYY-MM-DD
 * @param {'a'|'c'} servicio
 */
export function esAccesoPorRemanentes(servicio, remanentesActivos, fecha) {
  const activos = remanentesActivos?.[fecha]?.[servicio];
  return Boolean(activos && activos.activo === true && Number(activos.cantidad) > 0);
}
