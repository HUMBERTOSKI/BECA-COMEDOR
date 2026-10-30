// worker/cocina.js — Módulo Telegram COCINA
//
// Todo lo relacionado con el bot interno de cocina (@becacomedorBOT):
//   - Envío del estimado de comensales al grupo "COCINA Beca Comedor"
//     (se ejecuta por cron a las 10:30 Bolivia y manualmente desde el panel).
//
// La lógica es idéntica a la que estaba en el worker monolítico.

import { fsQuery, sendTelegram, todayBolivia } from './core.js';

async function estimadoCocina(env, chatId, botToken) {
  const fecha = todayBolivia();
  const votes = await fsQuery(env, 'votes', 'fecha', fecha, 2000);
  // El estimado de cocina se hace con las raciones del ALMUERZO. Los votos de la
  // cena (servicio 'c') no cuentan aquí; los votos antiguos sin campo son almuerzo.
  const almuerzo = votes.filter((v) => (v.servicio?.stringValue || 'a') === 'a');
  const si = almuerzo.filter((v) => v.respuesta?.stringValue === 'si').length;
  const no = almuerzo.filter((v) => v.respuesta?.stringValue === 'no').length;
  const text = [
    `🔪 *Estimado del comedor — ${fecha}*`,
    '',
    `🟢 Asistirán a almorzar: *${si}*`,
    `🔴 No almorzarán: ${no}`,
    '',
    `🍳 Prepara alrededor de *${si}* raciones.`,
    'La votación ya cerró. ¡Buen provecho!',
  ].join('\n');
  await sendTelegram(env, botToken, 'sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

export { estimadoCocina };