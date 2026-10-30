// worker/estudiantes.js — Módulo Telegram ESTUDIANTES
//
// Todo lo relacionado con el bot público de estudiantes (@becacomedorEstBOT):
//   - Publicación del menú del día con botones de votación
//   - Registro de votos (callback /si/ /no) con reglas de negocio intactas
//   - Vinculación de la cuenta por teléfono (botón "Compartir mi número") o por ID (/miid)
//   - Comandos de texto: /start, /vincular, /miid, /menu
//
// La lógica es idéntica a la que estaba en el worker monolítico.

import {
  fsQuery,
  fsGet,
  fsCreate,
  fsPatch,
  sendTelegram,
  todayBolivia,
  localHHMM,
} from './core.js';
import {
  HORARIO_ALMUERZO,
  HORARIO_CENA,
  tieneCena,
  cenaEsParaLlevar,
  nombreFecha as formatNombreFecha,
} from '../src/utils/menuRules.js';

const siNoKeyboardAlmuerzo = {
  inline_keyboard: [
    [{ text: '🟢 Sí, iré a almorzar', callback_data: 'a_si' }],
    [{ text: '🔴 No asistiré al almuerzo', callback_data: 'a_no' }],
  ],
};

const siNoKeyboardCena = {
  inline_keyboard: [
    [{ text: '🟢 Sí, acudiré a la cena', callback_data: 'c_si' }],
    [{ text: '🔴 No acudiré a la cena', callback_data: 'c_no' }],
  ],
};

const contactKeyboard = {
  keyboard: [[{ text: '📱 Compartir mi número', request_contact: true }]],
  one_time_keyboard: true,
  resize_keyboard: true,
};

// ────────────────────────── textos y utilidades ─────────────────────────────

function menuText(menu, servicio = 'ambos', { cerrada = false } = {}) {
  const fecha = menu.fecha || todayBolivia();
  const almuerzo = menu.platillos || [];
  const cena = menu.platillosCena || [];
  const hora = menu.horaLimite || '10:30';
  const feriado = !!menu.feriado;
  const footer = cerrada
    ? ['', '🔒 La votación ya cerró. ¡Buen provecho!']
    : [
        '',
        `🗳️ Vota hasta las *${hora}*.`,
        'Tu voto nos ayuda a cocinar la cantidad justa y evitar el desperdicio (ODS 12).',
      ];
  const list = (items) => (items.length ? items.map((p, i) => `${i + 1}. ${p}`).join('\n') : '_Menú por definir._');
  const lines = [`🍽️ *Menú del día — ${formatNombreFecha(fecha)}*`];
  if (feriado) {
    lines.push('', '🎉 *Feriado:* se sirve *almuerzo y cena juntos*.', '');
    lines.push(`🍱 *Servicio combinado (${HORARIO_ALMUERZO})*`);
    lines.push(list([...almuerzo, ...cena]));
  } else if (servicio === 'cena') {
    const paraLlevar = cenaEsParaLlevar(fecha) ? ' (para llevar)' : '';
    lines.push('', `🌙 *Cena (${HORARIO_CENA})*${paraLlevar}`);
    lines.push(list(cena));
  } else if (servicio === 'almuerzo') {
    lines.push('', `🌞 *Almuerzo (${HORARIO_ALMUERZO})*`);
    lines.push(list(almuerzo));
  } else {
    lines.push('', `🌞 *Almuerzo (${HORARIO_ALMUERZO})*`);
    lines.push(list(almuerzo));
    if (tieneCena(fecha)) {
      const paraLlevar = cenaEsParaLlevar(fecha) ? ' (para llevar)' : '';
      lines.push('', `🌙 *Cena (${HORARIO_CENA})*${paraLlevar}`);
      lines.push(list(cena));
    }
  }
  return [...lines, ...footer].join('\n');
}

/** Deja solo dígitos de un teléfono (acepta "+591 71234567", "71234567", etc.). */
function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}

/** Compara dos teléfonos tolerando prefijos país/cero inicial. */
function samePhone(a, b) {
  const x = normalizePhone(a);
  const y = normalizePhone(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
}

// ────────────────────────── vínculo por teléfono ────────────────────────────

/** Vincula el Telegram del usuario al estudiante cuyo teléfono coincide. */
async function vincularPorTelefono(env, userId, phone) {
  const students = await fsQuery(env, 'students', undefined, undefined, 5000);
  const candidates = students.filter((s) => s.telefono?.stringValue);
  const exact = candidates.filter((s) => normalizePhone(s.telefono.stringValue) === normalizePhone(phone));
  const loose = candidates.filter((s) => samePhone(s.telefono.stringValue, phone));
  const winner = exact.length === 1 ? exact[0] : loose.length === 1 ? loose[0] : null;
  if (!winner) return { ok: false, code: 'no_match' };
  if (winner.activo?.booleanValue === false) return { ok: false, code: 'inactivo' };
  await fsPatch(env, `students/${encodeURIComponent(winner.id)}`, {
    telegramUserId: { stringValue: String(userId) },
  });
  return { ok: true, nombre: winner.nombre?.stringValue || '' };
}

// ────────────────────────────── votación ────────────────────────────────────

// `servicio` identifica la votación: 'a' (almuerzo) o 'c' (cena). Cada uno tiene
// su propio documento `{fecha}_{studentId}_{servicio}`, así un estudiante vota
// por separado para cada servicio. Los votos antiguos (sin campo `servicio`)
// se tratan como almuerzo.
async function registrarVoto(entorno, userId, respuesta, servicio = 'a') {
  const matches = await fsQuery(entorno, 'students', 'telegramUserId', userId, 5);
  if (matches.length === 0) return { ok: false, code: 'no_vinculado' };
  const student = matches[0];
  const studentId = student.id;
  if (student.activo?.booleanValue === false) return { ok: false, code: 'inactivo' };

  const fecha = todayBolivia();
  const menu = await fsGet(entorno, `menus/${fecha}`);
  if (!menu || menu.estado?.stringValue !== 'publicado') return { ok: false, code: 'sin_votacion' };

  const limite = menu.horaLimite?.stringValue || '10:30';
  if (localHHMM() > limite) return { ok: false, code: 'cerrada', limite };

  // Un voto de almuerzo hecho con la clave antigua (sin sufijo de servicio) no
  // debe duplicarse: si existía, cuenta como si ya hubiera votado almuerzo.
  if (servicio === 'a') {
    const legacy = await fsGet(entorno, `votes/${fecha}_${studentId}`);
    if (legacy) return { ok: false, code: 'ya_voto' };
  }

  const created = await fsCreate(entorno, 'votes', `${fecha}_${studentId}_${servicio}`, {
    fecha: { stringValue: fecha },
    studentId: { stringValue: studentId },
    servicio: { stringValue: servicio },
    respuesta: { stringValue: respuesta },
    telegramUserId: { stringValue: String(userId) },
    timestamp: { timestampValue: new Date().toISOString() },
  });
  if (!created) return { ok: false, code: 'ya_voto' };
  return { ok: true, code: 'ok' };
}

async function handleCallback(env, cb, botToken) {
  const userId = cb.from?.id;
  const cbId = cb.id;
  if (!userId) return;

  let servicio = 'a';
  let data = null;
  const parsed = /^(a|c)_(si|no)$/.exec(cb.data || '');
  if (parsed) {
    servicio = parsed[1];
    data = parsed[2];
  } else if (cb.data === 'si' || cb.data === 'no') {
    data = cb.data; // votos antiguos = almuerzo
  }
  if (!data) return;

  const result = await registrarVoto(env, userId, data, servicio);
  const servicioLabel = servicio === 'c' ? 'cena' : 'almuerzo';
  const texts = {
    ok: `✅ Voto de ${servicioLabel} registrado. ¡Nos vemos en el comedor!`,
    ya_voto: `Ya registraste tu voto de ${servicioLabel} hoy.`,
    no_vinculado: 'Tu cuenta no está vinculada. Escribe /miid y pide al administrador que registre tu ID.',
    inactivo: 'Tu credencial está desactivada. Consulta al administrador.',
    sin_votacion: 'La votación de hoy aún no está abierta.',
    cerrada: `La votación cerró a las ${result.limite || '10:30'}.`,
  };
  const text = texts[result.code] || 'No se pudo registrar el voto.';
  await sendTelegram(env, botToken, 'answerCallbackQuery', {
    callback_query_id: cbId,
    text,
    show_alert: result.code === 'no_vinculado' || result.code === 'inactivo',
  });
}

// ────────────────────────────── mensajes ────────────────────────────────────

async function handleMessage(env, msg, botToken) {
  // ── El usuario comparte su número desde el botón ──
  if (msg.contact?.phone_number) {
    if (msg.chat?.type !== 'private') return; // solo vinculamos en chats privados
    let result;
    try {
      result = await vincularPorTelefono(env, msg.from?.id, msg.contact.phone_number);
    } catch (e) {
      console.error('vincular error', e);
      result = { ok: false, code: 'error' };
    }
    const texts = {
      ok: `✅ ¡Vinculado como ${result.nombre || 'estudiante'}! Ya puedes votar con los botones del menú.`,
      no_match: '❌ No encontramos tu teléfono en el registro. Verifica que el administrador registró tu número, o usa /miid como alternativa.',
      inactivo: 'Tu credencial está desactivada. Consulta al administrador.',
      error: 'Ocurrió un error al vincular. Intenta de nuevo en unos minutos.',
    };
    return sendTelegram(env, botToken, 'sendMessage', {
      chat_id: msg.chat.id,
      text: texts[result.code] || texts.error,
    });
  }

  const text = (msg.text || '').trim();
  let reply = null;
  if (text === '/start') {
    reply = [
      '👋 Hola, soy el bot de la Beca Comedor U.A.B.J.B.',
      '',
      '🔹 Cada mañana publico el menú del día con botones para votar si asistirás.',
      '🔹 Para votar, tu cuenta debe estar vinculada al registro.',
      '',
      '📱 *Vinculación automática:* escribe /vincular y pulsa "Compartir mi número".',
      '✍️ *Alternativa:* escribe /miid y pasa tu número de ID al administrador.',
      '',
      '📖 Comando /menu: ver el menú de hoy.',
    ].join('\n');
  } else if (text === '/vincular') {
    if (msg.chat?.type === 'private') {
      await sendTelegram(env, botToken, 'sendMessage', {
        chat_id: msg.chat.id,
        text: 'Envía tu número de teléfono para vincular tu cuenta:',
        reply_markup: contactKeyboard,
      });
      return;
    }
    reply = 'Abre un chat privado conmigo (@becacomedorEstBOT) y usa el comando /vincular para compartir tu número.';
  } else if (text === '/miid') {
    if (msg.chat?.type === 'group' || msg.chat?.type === 'supergroup') {
      reply = `\`${msg.chat.id}\``;
    } else {
      const uid = msg.from?.id;
      reply = `Tu ID de Telegram es: \`${uid}\`\n\nPásale este número al administrador para vincular tu cuenta.`;
    }
  } else if (text === '/menu') {
    const fecha = todayBolivia();
    const menu = await fsGet(env, `menus/${fecha}`);
    if (menu && menu.estado?.stringValue === 'publicado') {
      const limite = menu.horaLimite?.stringValue || '10:30';
      reply = menuText(
        {
          fecha,
          platillos: (menu.platillos?.arrayValue?.values || []).map((v) => v.stringValue),
          platillosCena: (menu.platillosCena?.arrayValue?.values || []).map((v) => v.stringValue),
          feriado: menu.feriado?.booleanValue === true,
          horaLimite: limite,
        },
        'ambos',
        { cerrada: localHHMM() > limite },
      );
    } else {
      reply = '📅 El menú de hoy aún no ha sido publicado. Intenta más tarde.';
    }
  }
  if (!reply) return;
  await sendTelegram(env, botToken, 'sendMessage', { chat_id: msg.chat.id, text: reply, parse_mode: 'Markdown' });
}

// ─────────────────────────── publicación de menú ─────────────────────────────

// Envía la encuesta de un día al grupo de estudiantes al instante.
// `fecha` es opcional (por defecto hoy). `servicio` controla qué se manda:
//   'almuerzo' → solo el menú del almuerzo con sus botones (clave a_*)
//   'cena'     → solo el menú de la cena con sus botones (clave c_*)
//   'ambos'    → dos mensajes: almuerzo y cena
// En feriado se envía un único mensaje combinado con la votación del almuerzo.
// Si el plazo ya venció, se envía el menú SIN botones (solo informativo).
// Guarda los message_id en el doc del menú para poder quitar los botones luego.
async function publicarMenu(env, chatId, botToken, fecha, servicio = 'ambos') {
  const d = fecha || todayBolivia();
  const menu = await fsGet(env, `menus/${d}`);
  if (!menu) return { published: false };

  const base = {
    fecha: d,
    platillos: (menu.platillos?.arrayValue?.values || []).map((v) => v.stringValue),
    platillosCena: (menu.platillosCena?.arrayValue?.values || []).map((v) => v.stringValue),
    feriado: menu.feriado?.booleanValue === true,
    horaLimite: menu.horaLimite?.stringValue || '10:30',
  };
  const cerrada = localHHMM() > base.horaLimite;

  let mensajes = 0;
  let msgAlmuerzo = null;
  let msgCena = null;
  const send = async (serv, kb) => {
    const { body } = await sendTelegram(env, botToken, 'sendMessage', {
      chat_id: chatId,
      text: menuText(base, serv),
      parse_mode: 'Markdown',
      ...(kb ? { reply_markup: kb } : {}),
    });
    mensajes += 1;
    return body?.result?.message_id || null;
  };

  if (base.feriado) {
    msgAlmuerzo = await send('ambos', cerrada ? null : siNoKeyboardAlmuerzo);
  } else if (servicio === 'almuerzo') {
    msgAlmuerzo = await send('almuerzo', cerrada ? null : siNoKeyboardAlmuerzo);
  } else if (servicio === 'cena') {
    if (!tieneCena(d)) return { published: false, reason: 'sin_cena' };
    msgCena = await send('cena', cerrada ? null : siNoKeyboardCena);
  } else {
    msgAlmuerzo = await send('almuerzo', cerrada ? null : siNoKeyboardAlmuerzo);
    if (tieneCena(d)) msgCena = await send('cena', cerrada ? null : siNoKeyboardCena);
  }

  const patch = { estado: { stringValue: 'publicado' }, cerrado: { booleanValue: cerrada } };
  if (msgAlmuerzo) patch.msgAlmuerzo = { integerValue: String(msgAlmuerzo) };
  if (msgCena) patch.msgCena = { integerValue: String(msgCena) };
  await fsPatch(env, `menus/${d}`, patch);
  return { published: true, mensajes, cerrada };
}

// Quita los botones de votación de los mensajes ya enviados de HOY cuando el
// plazo venció, dejando solo el menú (con el día resaltado) y un aviso de cierre.
async function cerrarVotaciones(env) {
  const fecha = todayBolivia();
  const menu = await fsGet(env, `menus/${fecha}`);
  if (!menu || menu.estado?.stringValue !== 'publicado') return { closed: false };
  if (menu.cerrado?.booleanValue === true) return { closed: false };

  const limite = menu.horaLimite?.stringValue || '10:30';
  if (localHHMM() <= limite) return { closed: false };

  const base = {
    fecha,
    platillos: (menu.platillos?.arrayValue?.values || []).map((v) => v.stringValue),
    platillosCena: (menu.platillosCena?.arrayValue?.values || []).map((v) => v.stringValue),
    feriado: menu.feriado?.booleanValue === true,
    horaLimite: limite,
  };
  const edit = (messageId, serv) =>
    sendTelegram(env, env.BOT_TOKEN, 'editMessageText', {
      chat_id: env.TELEGRAM_CHAT_ID,
      message_id: Number(messageId),
      text: menuText(base, serv, { cerrada: true }),
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    });

  const msgAlmuerzo = menu.msgAlmuerzo?.integerValue;
  const msgCena = menu.msgCena?.integerValue;
  if (msgAlmuerzo) await edit(msgAlmuerzo, base.feriado ? 'ambos' : 'almuerzo');
  if (msgCena) await edit(msgCena, 'cena');

  await fsPatch(env, `menus/${fecha}`, { cerrado: { booleanValue: true } });
  return { closed: true };
}

export {
  handleCallback,
  handleMessage,
  publicarMenu,
  cerrarVotaciones,
  registrarVoto,
  vincularPorTelefono,
  menuText,
  normalizePhone,
  samePhone,
};