// worker/index.js — Entrada del Worker (enrutador HTTP + cron).
//
// Punto único de llegada de Cloudflare. Según la ruta delega a los módulos:
//   POST /                Webhook de Telegram (callbackQuery/voto → estudiantes)
//   POST /validate        Mesón: QR + anti-duplicidad (worker/meson.js)
//   POST /publicarmenu    Panel: publicar menú de hoy (worker/estudiantes.js)
//   POST /notify-kitchen  Panel: estimado a cocina (worker/cocina.js)
//   Cron 12:00 UTC        Publica el menú del día
//   Cron 14:30 UTC        Envía el estimado a cocina
//
// El contexto del bot se resuelve por el header X-Telegram-Bot-Api-Secret-Token.

import {
  corsFor,
  allowedOrigins,
  checkRateLimit,
  json,
} from './core.js';
import { handleCallback, handleMessage, publicarMenu, cerrarVotaciones } from './estudiantes.js';
import { estimadoCocina } from './cocina.js';
import { validate } from './meson.js';
import { procesarEnvios } from './envios.js';
import { liberarRemanentes } from './remanentes.js';

/** Contexto activo del webhook según el secret_token de Telegram. */
function botCtx(env, callerSecret) {
  if (callerSecret && callerSecret === env.WEBHOOK_SECRET) return { token: env.BOT_TOKEN, rol: 'estudiantes' };
  if (callerSecret && callerSecret === env.WEBHOOK_SECRET_COCINA) return { token: env.BOT_TOKEN_COCINA, rol: 'cocina' };
  return null;
}

export default {
  async fetch(request, envSecreto, ctx) {
    const headers = corsFor(request, envSecreto);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

    if (!envSecreto.BOT_TOKEN) return new Response('Config error', { status: 500, headers });
    const ip = request.headers.get('cf-connecting-ip');
    if (!checkRateLimit(ip)) return json({ error: 'rate' }, 429, headers);

    const url = new URL(request.url);

    try {
      // ── Webhook de Telegram ──
      if (url.pathname === '/') {
        const caller = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        const botact = botCtx(envSecreto, caller);
        if (!botact) return new Response('Unauthorized', { status: 403, headers });
        const update = await request.json();
        ctx.waitUntil((async () => {
          if (update.callback_query) await handleCallback(envSecreto, update.callback_query, botact.token);
          else if (update.message) await handleMessage(envSecreto, update.message, botact.token);
        })());
        return json({ ok: true });
      }

      // ── Llamadas del frontend (origin-guarded) ──
      const origin = request.headers.get('Origin') || '';
      if (!allowedOrigins(envSecreto).includes(origin)) {
        return new Response('Forbidden', { status: 403, headers });
      }
      const body = await request.json().catch(() => ({}));

      if (url.pathname === '/validate') {
        return json(await validate(envSecreto, body.code), 200, headers);
      }

      if (url.pathname === '/liberar-remanentes') {
        const servicio = ['a', 'c'].includes(body.servicio) ? body.servicio : undefined;
        const res = await liberarRemanentes(envSecreto, { ...body, servicio });
        return json(res, 200, headers);
      }

      if (url.pathname === '/publicarmenu') {
        const fecha = typeof body.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha) ? body.fecha : undefined;
        const servicio = ['almuerzo', 'cena', 'ambos'].includes(body.servicio) ? body.servicio : 'ambos';
        const res = await publicarMenu(envSecreto, envSecreto.TELEGRAM_CHAT_ID, envSecreto.BOT_TOKEN, fecha, servicio);
        return json({ ...res, fecha: fecha || undefined, servicio }, 200, headers);
      }

      if (url.pathname === '/notify-kitchen') {
        if (!envSecreto.TELEGRAM_KITCHEN_CHAT_ID) return json({ error: 'Sin chat de cocina' }, 400, headers);
        await estimadoCocina(envSecreto, envSecreto.TELEGRAM_KITCHEN_CHAT_ID, envSecreto.BOT_TOKEN_COCINA);
        return json({ ok: true }, 200, headers);
      }

      return json({ error: 'not found' }, 404, headers);
    } catch (err) {
      console.error('Worker Error:', err);
      return json({ ok: false, error: 'worker_error' }, 500, headers);
    }
  },

  async scheduled(event, envSecreto, ctx) {
    const cron = event.cron || '';
    ctx.waitUntil((async () => {
      if (cron === '12 0 * * *') {
        await publicarMenu(envSecreto, envSecreto.TELEGRAM_CHAT_ID, envSecreto.BOT_TOKEN).catch((e) => console.error('cron menu', e));
      } else if (cron === '30 14 * * *') {
        if (envSecreto.TELEGRAM_KITCHEN_CHAT_ID) {
          await estimadoCocina(envSecreto, envSecreto.TELEGRAM_KITCHEN_CHAT_ID, envSecreto.BOT_TOKEN_COCINA).catch((e) => console.error('cron kitchen', e));
        }
      } else if (cron === '* * * * *') {
        await procesarEnvios(envSecreto).catch((e) => console.error('cron envios', e));
        await cerrarVotaciones(envSecreto).catch((e) => console.error('cron cierre', e));
      }
    })());
  },
};