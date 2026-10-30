# Resumen y Documentación del Proyecto: Beca Comedor U.A.B.J.B

Sistema de gestión del comedor de la **Universidad Autónoma del Beni José Ballivián (U.A.B.J.B)**: registro de beneficiarios, carnets con QR, publicación del menú en Telegram con votación por servicio, estimación de raciones, validación en el mesón (**offline-first**) y liberación de raciones remanentes (**ODS 12 · Meta 12.3**). **React + Vite + Firebase** (Auth, Firestore, Hosting) con un worker gratuito de **Cloudflare** para Telegram.

> Última actualización: 2026-09-24 · Worker en producción: versión `2f8c71c6` (incluye `/liberar-remanentes`).

---

## 🏗 Estructura General

```text
/
├── dist/                  # Generada al hacer build (Hosting).
├── src/                   # Código fuente React (main.jsx, App.jsx, index.css).
│   ├── admin/             # Panel (ver Roles abajo).
│   ├── cocina/            # Mesón y pronóstico.
│   ├── recepcion/         # Módulo recepcionista (escáner de entrada).
│   ├── auth/              # AuthModal (login email/contraseña).
│   ├── components/        # SyncStatusBadge (estado offline / cola de sincronización).
│   ├── services/          # firebase, firestoreRest, firestoreService, workerClient, authService, offlineSyncService, audio.
│   ├── utils/             # dates, menuRules, metrics, remanentes, qr, image, camera (frontal/trasera).
│   └── __tests__/         # Suite Vitest (ver Pruebas).
├── worker/                # Cloudflare Worker modular (index, core, estudiantes, cocina, meson, envios, remanentes).
├── scripts/               # Utilidades Node (seed, rules, webhook, diagnóstico).
├── index.html             # SPA + favicon.
├── vite.config.js         # React + Tailwind + manualChunks (vendor/scanner).
├── firebase.json          # Hosting (dist, rewrites) + reglas Firestore.
├── firestore.rules        # Reglas de seguridad de Firestore.
├── wrangler.toml          # Config del Worker (vars, secrets y crons).
└── package.json           # Deps React, lucide-react, firebase, qrcode.react, html5-qrcode, tailwindcss.
```

> ⚠️ `firebase-service-account.json`, `.webhook-secret*` y `.env` (gitignoreados) son **secretos**; no se suben a repos.

---

## 👥 Roles y Vistas

1. **Estudiante / Beneficiario** (sin login, bot `@becacomedorEstBOT`): recibe el menú, **vota Sí/No por separado para almuerzo y cena**, consulta con `/menu`, se vincula compartiendo su número (`/vincular`) o con `/miid`.
2. **Administrador** (`AdminDashboard.jsx`): pestañas de **Estudiantes** (`StudentsTab`), **Carnets** (`CarnetTab`), **Menú del día** (`MenuTab`) y **Métricas** (`MetricsTab`).
3. **Cocina** (`KitchenApp.jsx`): pantalla de **Mesón** (`ScannerScreen`) y **Pronóstico** (`ForecastView`).
4. **Recepcionista** (`ReceptionistApp.jsx`): escáner mínimo en el punto de entrada — cámara **siempre leyendo**, **toggle frontal/trasera** (`utils/camera.js`) y al escanear muestra **nombre, CI, RU, carrera y foto**; registra asistencia y bloquea duplicados (`ya_comio`). Funciona **offline-first** (ver `offlineSyncService`).
5. **Sistema** (Worker + crons): publica el menú, envía el estimado a cocina, procesa envíos programados y **cierra votaciones**.

> **Rol** en `admins/{uid}.rol` (`admin` / `cocina` / `recepcionista`) + `habilitado`. Sin login → `AuthModal`; `#/meson` y `#/recepcion` abren esas vistas (staff).

---

## 🛠 Servicios de Datos (`src/services/` y `src/utils/`)

- **`firebase.js`**: inicializa App + Auth.
- **`firestoreRest.js` / `firestoreService.js`**: el navegador **no usa el SDK de Firestore** (su WebChannel no funciona con la BD `default`); todo pasa por **REST con el ID token**, con *polling* (`pollQuery`) para lecturas "en vivo".
- **`offlineSyncService.js`**: **offline-first** para el escáner (mesón/recepción). Cachea estudiantes y asistencias del día en `localStorage`; valida en <50 ms sin red (bloqueo local de duplicados `ya_comio`) y encola la asistencia; al volver la red sube la cola con **`/validate` idempotente** (`{fecha}_{studentId}`). Estado vía `SyncStatusBadge`.
- **`workerClient.js`**: llama al Worker (`/validate`, `/publicarmenu`, `/notify-kitchen`, `/liberar-remanentes`); **nunca** expone el token del bot en el navegador.
- **`authService.js`** (`watchAuth` / `watchRole`), **`audio.js`** (beeps Web Audio ok/fail).
- **`utils/`**: `dates.js` (hora Bolivia UTC-4), `menuRules.js` (reglas y nombres de día/fecha, compartido con el worker), `metrics.js` y `remanentes.js` (ODS 12 · Meta 12.3), `qr.js` (`BECA1:<studentId>`), `image.js` (fotos comprimidas a dataURL).

---

## 🗄 Modelo de Datos (Firestore, BD `default`)

| Colección | Doc ID | Campos |
|-----------|--------|--------|
| `admins` | `{uid}` | `email`, `nombre`, `rol` (`admin`/`cocina`/`recepcionista`), `habilitado` |
| `students` | auto | `nombre`, `ci`, `ru`, `carrera`, `telefono`, `foto` (dataURL), `activo`, `telegramUserId`, fechas |
| `menus` | `{YYYY-MM-DD}` | `platillos[]` (almuerzo), `platillosCena[]`, `feriado`, `horaLimite` (`10:30`), `estado` (`borrador`/`publicado`), `cerrado`, `msgAlmuerzo`, `msgCena` |
| `votes` | `{fecha}_{studentId}_{a\|c}` | `servicio` (`a`/`c`), `respuesta` (`si`/`no`), `telegramUserId`, `timestamp` |
| `attendance` | `{fecha}_{studentId}` | `fecha`, `studentId`, `timestamp` (registro en mesón; bloqueo anti-duplicidad) |
| `remanentes` | `{fecha}_{servicio}` | `fecha`, `servicio` (`a`/`c`), `cantidad`, `kgRescatados`, `horaFin`, `activo`, `liberadoEn` (liberación ODS 12; la escribe el worker) |
| `envios` | auto | `fecha`, `enviarEn` (timestamp), `servicio` (`almuerzo`/`cena`/`ambos`), `estado` (`pendiente`/`enviado`) |
| `config` | `general` | `kgPorRacion`, `margenSeguridad` |

**Reglas de servicio** (`menuRules.js`): almuerzo 12:00–14:00 todos los días; cena 18:00–19:00 **lunes a sábado** (sábado **para llevar**); **domingo sin cena**; toggle **Feriado** = almuerzo y cena juntos. Todo en hora **UTC-4**.

---

## 🤖 Telegram (Cloudflare Worker — gratuito, sin Cloud Functions)

El plan Spark no permite Cloud Functions, así que la lógica de Telegram vive en un **Cloudflare Worker** modular (`worker/`):

- **Webhook `POST /`**: recibe los clics de votación (`callback_query` `a_si/a_no/c_si/c_no`, + legacy `si/no`). El worker escribe en Firestore autenticándose con **cuenta de servicio** (JWT RSA → token OAuth → Bearer) y edita el mensaje/elimina botones. `registrarVoto` valida vínculo/estado, menú publicado y `horaLimite` (anti-duplicado).
- **`/publicarmenu`**: el panel publica el menú; body `{ fecha?, servicio }` (`almuerzo`/`cena`/`ambos`). Envía uno o dos mensajes con **encuesta Sí/No por servicio** y guarda `msgAlmuerzo`/`msgCena`; si ya venció el plazo, envía **sin botones**.
- **`/validate`**: mesón/recepción; decodifica el QR, marca `attendance/{fecha}_{id}` y responde autorizado/bloqueado con datos del estudiante (`nombre`, `ci`, `ru`, `carrera`, `foto`).
- **`/notify-kitchen`**: envía el estimado de raciones de **almuerzo** al grupo interno (`cocina.js`, cuenta solo votos `a`).
- **`/liberar-remanentes`**: el pronóstico superó lo servido → libera el excedente (ODS 12): estima `remanentes = votosSí − raciones`, notifica al grupo de estudiantes (orden de llegada, hora límite, carnet QR) y registra `remanentes/{fecha}_{servicio}` (`remanentes.js`).
- **Cierre automático** (`cerrarVotaciones`): a la hora límite, edita los mensajes para **quitar botones** ("🔒 La votación ya cerró") y marca `cerrado: true`.
- **Seguridad:** `X-Telegram-Bot-Api-Secret-Token` por bot, CORS por `ALLOWED_ORIGINS` y rate-limit por IP.

**Secretos del worker (`wrangler secret put`):** `BOT_TOKEN`, `BOT_TOKEN_COCINA`, `SERVICE_ACCOUNT`, `WEBHOOK_SECRET`, `WEBHOOK_SECRET_COCINA`. Vars: `FIREBASE_PROJECT_ID`, `TELEGRAM_CHAT_ID`, `TELEGRAM_KITCHEN_CHAT_ID`, `ALLOWED_ORIGINS`.

---

## ⏰ Crons (`wrangler.toml`, en UTC)

| Cron | Hora Bolivia | Acción |
|------|--------------|--------|
| `12 0 * * *` | 08:00 | Publica el menú del día (almuerzo + cena) en el grupo de estudiantes. |
| `30 14 * * *` | 10:30 | Envía el **estimado de raciones** al grupo de cocina. |
| `* * * * *` | cada minuto | Procesa **envíos programados** (`envios.js`) y **cierra votaciones** vencidas. |

**Envíos programados:** el panel crea `envios/{id}` con `{fecha, enviarEn, servicio}`; el cron publica ese menú con el servicio indicado y lo marca `enviado`.

---

## 🖨 Carnets y Mesón

- **Carnets** (`CarnetCard`): tarjeta **85,6 × 54 mm** con foto y **QR** `BECA1:<id>`; selección individual/masiva e impresión (`@media print` en `index.css`).
- **Mesón** (`ScannerScreen`): escaneo con `html5-qrcode` (o código manual) → verde con foto + beep, o rojo "BLOQUEADO" (`ya_comio`, `inactivo`, `no_registrado`, `qr_invalido`). **Offline-first**: con caché en `localStorage` y cola de sincronización; si corta la red valida local (marca "Registrado · sin conexión") y sube la asistencia al volver (`SyncStatusBadge`).
- **Recepción** (`ReceptionistApp`): escáner mínimo con cámara que lee **de forma continua** (se reanuda sola a los ~2,5 s), **toggle frontal/trasera** (`utils/camera.js`) y fallback manual; al escanear muestra **nombre, CI, RU, carrera y foto** y registra asistencia con el mismo `/validate` (anti-duplicidad). Igual que el mesón: **offline-first** con badge de sincronización.
- **Pronóstico** (`ForecastView`): menú de hoy, cuenta regresiva al cierre, votos Sí del almuerzo y cena, raciones servidas y kg salvados. Añade la card **Raciones remanentes (ODS 12)**: si el pronóstico superó lo servido calcula el excedente y los kg rescatados, y permite **liberarlos notificando al grupo**, con **bloqueo anti-reenvío de 10 min** (`utils/remanentes.js`).
- **Métricas** (`MetricsTab`, ODS 12): votos Sí/No, ración servida, **precisión**, **kg salvados** y recomendación `votosSí × (1 + margen)`; tabla de últimos 10 días.

---

## 🔐 Reglas de Seguridad (`firestore.rules`)

- `admins`: lectura del propio rol; escritura solo admin.
- `students`, `menus`, `envios`, `config`: lectura staff, escritura admin.
- `votes`, `attendance`, `remanentes`: **solo lectura** en el panel; escritura **exclusivamente vía Worker** (cuenta de servicio).

> Releases: `cloud.firestore` y `cloud.firestore/default` (la BD se llama literalmente `default`; `(default)` da 404).

---

## 🧪 Pruebas

`npm test` (Vitest). **94 pruebas en 12 archivos:** `worker`, `publicarMenu`, `cierre`, `votos`, `envios`, `remanentes`, `offlineSync`, `dates`, `metrics`, `qr`, `camera` e `integration-rest` (login real + lectura de rol por REST).

---

## 🚀 Despliegue

```bash
npm run build                                   # Vite empaqueta en dist/
firebase deploy --only hosting                  # Publica https://beca-comedor-uabjb.web.app
npx wrangler deploy                             # Actualiza el Worker (worker/)
node scripts/deploy-rules-user.mjs              # Reglas de Firestore (release cloud.firestore/default)
node scripts/set-webhook.mjs                    # Registra/rota los webhooks de ambos bots
```

- **Worker:** https://beca-comedor-telegram.humbertorellano6abril.workers.dev
- **Mesón (cocina):** https://beca-comedor-uabjb.web.app/#/meson
- **Recepción:** https://beca-comedor-uabjb.web.app/#/recepcion

**Scripts útiles (`scripts/`):** `seed-admin.mjs` (crea/actualiza usuarios con rol `admin`/`cocina`/`recepcionista` vía `ADMIN_ROLE`), `seed-menu.mjs`, `check-db.mjs`, `enable-auth.mjs`, `deploy-rules.mjs`.
