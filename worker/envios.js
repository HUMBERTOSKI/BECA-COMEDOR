// worker/envios.js — Módulo ENVÍOS PROGRAMADOS
//
// El panel agenda publicaciones de menús en la colección `envios`:
//   { fecha: 'YYYY-MM-DD', enviarEn: <timestamp>, estado: 'pendiente' }
//
// Un cron por minuto llama a procesarEnvios: cuando la hora llega, publica la
// encuesta de ese menú en el grupo de estudiantes y marca el envío como
// `enviado`. La lógica es idéntica a la publicación manual.

import { fsQuery, fsPatch } from './core.js';
import { publicarMenu } from './estudiantes.js';

/** Procesa todos los envíos cuya hora ya llegó. Devuelve cuántos se despacharon. */
async function procesarEnvios(env, now = Date.now()) {
  const items = await fsQuery(env, 'envios', undefined, undefined, 5000);
  const due = items.filter((it) => {
    if (it.estado?.stringValue && it.estado?.stringValue !== 'pendiente') return false;
    const ts = it.enviarEn?.timestampValue || it.enviarEn?.stringValue;
    if (!ts) return false;
    return new Date(ts).getTime() <= now;
  });
  for (const it of due) {
    try {
      const servicio = it.servicio?.stringValue || 'ambos';
      const res = await publicarMenu(env, env.TELEGRAM_CHAT_ID, env.BOT_TOKEN, it.fecha?.stringValue, servicio);
      if (!res.published) console.error('envio sin menu', it.fecha?.stringValue, servicio);
    } catch (e) {
      console.error('envio error', it.id, e);
    }
    await fsPatch(env, `envios/${encodeURIComponent(it.id)}`, { estado: { stringValue: 'enviado' } });
  }
  return due.length;
}

export { procesarEnvios };