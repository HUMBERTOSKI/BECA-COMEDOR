// worker/core.js — Infraestructura compartida del Worker.
//
// Reúne, SIN cambiar lógica, las piezas comunes que usan los módulos:
//   - Firma RS256 + intercambio OAuth con la cuenta de servicio de Firebase
//   - Cliente REST Firestore (la BD nativa se llama literalmente `default`)
//   - Cliente de la Bot API de Telegram
//   - Fechas locales (Bolivia, UTC-4)
//   - Rate-limit, CORS y utilidades de respuesta HTTP

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const ipRequestCounts = new Map();

const toBase64Url = (input) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToArrayBuffer = (pem) => {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
};

async function signRS256(data, privateKeyPem) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  return toBase64Url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data)));
}

let tokenCache = { token: null, expiresAt: 0 };

/** Token de acceso de la cuenta de servicio para hablar con Firestore. */
async function getOAuthToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && now < tokenCache.expiresAt - 60) return tokenCache.token;
  const sa = JSON.parse(env.SERVICE_ACCOUNT);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = toBase64Url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = await signRS256(unsigned, sa.private_key);
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('OAuth exchange failed');
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + (data.expires_in || 3600);
  return data.access_token;
}

// Nota: la base de datos nativa se llama literalmente `default` (nueva
// nomenclatura de Firebase); usar `(default)` respondería 404 NOT_FOUND.
const fsBase = (env) =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/default/documents`;

async function fsGet(env, path) {
  const token = await getOAuthToken(env);
  const resp = await fetch(`${fsBase(env)}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`fsGet ${resp.status}`);
  const data = await resp.json();
  return data.fields || {};
}

async function fsCreate(env, collection, docId, fields) {
  const token = await getOAuthToken(env);
  const resp = await fetch(
    `${fsBase(env)}/${collection}?documentId=${encodeURIComponent(docId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields }),
    }
  );
  if (resp.status === 409 || resp.status === 400) return false; // ya existe
  if (!resp.ok) throw new Error(`fsCreate ${resp.status} ${(await resp.text()).slice(0, 200)}`);
  return true;
}

async function fsPatch(env, path, fields) {
  const token = await getOAuthToken(env);
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const resp = await fetch(`${fsBase(env)}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) throw new Error(`fsPatch ${resp.status} ${(await resp.text()).slice(0, 200)}`);
}

/** Consulta simple de igualdad sobre una colección (sin filtro si omites campo). */
async function fsQuery(env, collection, fieldPath, value, limit = 10) {
  const token = await getOAuthToken(env);
  const structuredQuery = { from: [{ collectionId: collection }] };
  if (fieldPath !== undefined) {
    structuredQuery.where = {
      fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { stringValue: String(value) } },
    };
  }
  if (limit) structuredQuery.limit = limit;
  const resp = await fetch(`${fsBase(env)}/:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!resp.ok) throw new Error(`fsQuery ${resp.status}`);
  const data = await resp.json();
  return data
    .filter((r) => r.document)
    .map((r) => ({
      id: decodeURIComponent(r.document.name.split('/').pop()),
      ...r.document.fields,
    }));
}

// Nota: Bolivia es UTC-4, por eso restamos 4h antes de leer las componentes
// UTC del Date; así "hoy local" y "HH:MM local" quedan correctos a toda hora.
const BOLIVIA_OFFSET_MS = -4 * 3600 * 1000;

/** Fecha local de Bolivia (UTC-4) en formato YYYY-MM-DD. */
function todayBolivia() {
  return new Date(Date.now() + BOLIVIA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hora local de Bolivia (UTC-4) en formato HH:MM. */
function localHHMM() {
  const d = new Date(Date.now() + BOLIVIA_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Envía una petición a la Bot API de Telegram. */
async function sendTelegram(env, botToken, method, payload) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  if (!resp.ok) console.error(`telegram ${method} fail`, resp.status, JSON.stringify(body).slice(0, 300));
  return { ok: resp.ok, body };
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const allow = allowed.includes(origin) ? origin : (allowed[0] || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (ipRequestCounts.size > 5000) {
    for (const [k, v] of ipRequestCounts) {
      if (now - v.ts > RATE_LIMIT_WINDOW) ipRequestCounts.delete(k);
    }
  }
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW) {
    ipRequestCounts.set(ip, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function json(respObj, status = 200, headers) {
  return new Response(JSON.stringify(respObj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export {
  toBase64Url,
  getOAuthToken,
  fsBase,
  fsGet,
  fsCreate,
  fsPatch,
  fsQuery,
  todayBolivia,
  localHHMM,
  sendTelegram,
  allowedOrigins,
  corsFor,
  checkRateLimit,
  json,
};