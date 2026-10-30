# 🎓 Guía de Explicación y Defensa del Proyecto ante el Docente
## Sistema de Gestión Beca Comedor — U.A.B.J.B

> **Universidad Autónoma del Beni José Ballivián (U.A.B.J.B)**  
> **Arquitectura del Software:** Modular por Capas (Separation of Concerns / Clean Frontend) + Backend Serverless en Cloudflare Worker + Base de Datos Firestore (REST) + Integración con Bots de Telegram.

---

## 📌 1. Resumen Ejecutivo (El "Elevator Pitch" para el Docente)

> *"Estimado docente, este proyecto resuelve la problemática de gestión de demanda y desperdicio de comida en el comedor de la U.A.B.J.B. Combina un panel administrativo, puntos de escaneo con credenciales QR físicas que operan **Offline-First** (funcionan aunque se caiga el internet en el comedor) y un bot de Telegram donde los estudiantes votan con anticipación si asistirán al almuerzo o cena. Con esto, la cocina prepara la cantidad exacta de raciones, cumpliendo las metas de reducción de desperdicio del **ODS 12 (Meta 12.3)**, y reduciendo a $0 los costos de infraestructura utilizando Cloudflare Workers y Firebase gratuito."*

---

## 🏗️ 2. Arquitectura General por Capas

El sistema aplica el principio de **Separación de Responsabilidades (SoC - Separation of Concerns)** dividiendo el software en 3 capas bien diferenciadas:

```mermaid
graph TD
    subgraph CAPA 1: PRESENTACIÓN (Vistas React)
        A1[AdminDashboard / Tabs]
        A2[ScannerScreen / Mesón]
        A3[ReceptionistApp / Entrada]
        A4[ForecastView / Cocina]
    end

    subgraph CAPA 2: CONTROL Y DOMINIO (Hooks y Utilidades)
        B1[useMenuCalendar]
        B2[useScanner]
        B3[useForecast]
        B4[useMetricsHistory]
        B5[utils: menuRules, qr, dates, remanentes, metrics]
    end

    subgraph CAPA 3: SERVICIOS Y PERSISTENCIA (Infraestructura)
        C1[firestoreRest / firestoreService]
        C2[offlineSyncService / localStorage]
        C3[workerClient]
        C4[Cloudflare Worker / RS256 JWT]
        C5[Firebase Firestore / default]
        C6[Telegram Bot API]
    end

    A1 --> B1
    A1 --> B4
    A2 --> B2
    A3 --> B2
    A4 --> B3

    B1 --> C1
    B1 --> C3
    B2 --> C2
    B2 --> C3
    B3 --> C1
    B3 --> C3
    B4 --> C1

    C3 --> C4
    C4 --> C5
    C4 --> C6
    C1 --> C5
```

### ¿Por qué esta arquitectura? (Justificación Técnica)
1. **Mantenibilidad:** Si se cambia la biblioteca de escaneo de cámara (`html5-qrcode`), solo se modifica el hook `useScanner`, sin tocar la interfaz de usuario de Cocina ni de Recepción.
2. **Testabilidad:** Las reglas de negocio (cálculo de fechas en Bolivia UTC-4, codificación QR, fórmulas ODS 12, sincronización offline) son funciones puras con **98 pruebas unitarias automatizadas en Vitest** pasando al 100%.
3. **Rendimiento:** Las pantallas son ligeras y declarativas; no mezclan lógica de red ni cálculos pesados en el JSX.

---

## 🧩 3. Desglose Módulo por Módulo

A continuación se detalla cada módulo para explicarlo con claridad al docente:

---

### 📦 MÓDULO 1: Identificación y Carnetización Estudiantil
* **Archivos clave:** 
  - Vistas: `src/admin/StudentsTab.jsx`, `src/admin/CarnetTab.jsx`, `src/admin/CarnetCard.jsx`, `src/admin/StudentFormModal.jsx`
  - Utilidades: `src/utils/qr.js`, `src/utils/image.js`
  - Servicio: `src/services/firestoreService.js`
* **Lógica implementada:**
  - **CRUD de beneficiarios:** Registro con Nombre, CI, RU, Carrera, Teléfono y Foto.
  - **Optimización sin costo:** La foto se comprime en el cliente vía Canvas HTML5 a JPEG de 250px en Base64 dataURL (~10-15 KB), almacenándose directamente en Firestore sin necesidad de contratar Firebase Storage de pago.
  - **Criptografía/Identificador QR:** Formato estándar `BECA1:<studentId>`, donde el ID es el hash unívoco generado por Firestore (imposible de falsificar o predecir en serie).
  - **Impresión estandarizada:** Los carnets usan dimensiones internacionales ISO/IEC 7810 ID-1 (85.6 × 54 mm) optimizados con reglas CSS `@media print` para imprimir en planchas fotográficas.

---

### 📦 MÓDULO 2: Planificación de Menús y Calendario
* **Archivos clave:**
  - Vista: `src/admin/MenuTab.jsx`
  - Hook de Dominio: `src/hooks/useMenuCalendar.js`
  - Reglas de Negocio: `src/utils/menuRules.js`, `src/utils/dates.js`
* **Lógica implementada:**
  - **Reglas del Comedor:**
    - Almuerzo: 12:00–14:00 (Lunes a Domingo).
    - Cena: 18:00–19:00 (Lunes a Viernes).
    - Sábados: La cena es **para llevar** (se entrega junto al almuerzo).
    - Domingos: **Sin servicio de cena**.
    - Feriados: Modo combinado (almuerzo y cena juntos).
  - **Manejo de Zona Horaria:** Bolivia está en **UTC-4**. El sistema normaliza todas las fechas y horas para evitar desfases de día causados por la zona horaria del servidor.
  - **Publicación Diferida (`envios`):** Permite agendar el menú para que se envíe automáticamente a las 08:00 AM mediante el cron de Cloudflare Worker, sin intervención humana.

---

### 📦 MÓDULO 3: Votación Anticipada y Mensajería (Telegram)
* **Archivos clave:**
  - Worker: `worker/estudiantes.js`, `worker/cocina.js`, `worker/core.js`
  - Configuración: `wrangler.toml`
* **Lógica implementada:**
  - **Bot de Estudiantes (`@becacomedorEstBOT`):** Publica el menú con botones interactivos (`🟢 Sí` / `🔴 No`) independientes para almuerzo y cena.
  - **Vinculación Segura:** El estudiante puede vincular su cuenta compartiendo su contacto telefónico nativo de Telegram (`/vincular`) o ingresando su ID (`/miid`).
  - **Cierre Atómico de Votación:** Al llegar la hora límite (ej. 10:30 AM), el worker elimina automáticamente los botones inline del mensaje en Telegram e inserta un texto "🔒 Votación cerrada", bloqueando votos fuera de término.
  - **Estimación a Cocina:** A las 10:30 AM, el worker envía un mensaje al grupo de Cocina con el número exacto de raciones que deben elaborarse.

---

### 📦 MÓDULO 4: Control de Acceso y Mesón (Motor Offline-First)
* **Archivos clave:**
  - Vistas: `src/cocina/ScannerScreen.jsx`, `src/recepcion/ReceptionistApp.jsx`
  - Hook de Dominio: `src/hooks/useScanner.js`
  - Servicio de Sincronización: `src/services/offlineSyncService.js`
  - Sonido: `src/services/audio.js`
* **Lógica implementada:**
  - **¿Qué pasa si se cae el internet?** El sistema implementa una arquitectura **Offline-First**:
    1. Al iniciar el día, descarga en caché local (`localStorage`) la lista de estudiantes y las asistencias ya registradas.
    2. Si se pierde la conexión, el escáner valida en **menos de 50 milisegundos** contra la memoria local. Si el estudiante ya comió, lo bloquea localmente.
    3. Si está habilitado, registra el consumo y lo encola en una `sync_queue`.
    4. Al restablecerse la red (evento `window.online`), la cola se sube en lotes al Cloudflare Worker de manera **idempotente** usando como clave `${fecha}_${studentId}`.
  - **Hardware de Cámara:** Detección de dispositivos, alternancia frontal/trasera, y fallback manual de teclado para carnets con QR deteriorado.
  - **Web Audio API:** Generación de ondas sonoras sinusoidales directas por navegador (beeps agudos para autorizado y graves para bloqueo), eliminando dependencias de archivos `.mp3`.

---

### 📦 MÓDULO 5: Sostenibilidad, Métricas y Remanentes (ODS 12 · Meta 12.3)
* **Archivos clave:**
  - Vistas: `src/cocina/ForecastView.jsx`, `src/admin/MetricsTab.jsx`
  - Hooks de Dominio: `src/hooks/useForecast.js`, `src/hooks/useMetricsHistory.js`
  - Fórmulas de Cálculo: `src/utils/metrics.js`, `src/utils/remanentes.js`
  - Endpoint Worker: `worker/remanentes.js`
* **Lógica implementada:**
  - **Alineación con los Objetivos de Desarrollo Sostenible (ODS 12.3):**
    - Reducir a la mitad el desperdicio mundial de alimentos per cápita.
  - **Fórmulas de Precisión y Kilos:**
    $$\text{Precisión} = \max\left(0, 1 - \frac{|\text{Votos Sí} - \text{Servidas}|}{\text{Votos Sí}}\right) \times 100$$
    $$\text{Kg Salvados} = \max(0, \text{Votos Sí} - \text{Servidas}) \times \text{kgPorRación}$$
  - **Liberación de Raciones Remanentes:** Si se prepararon 100 raciones y solo se sirvieron 85, sobran 15 raciones. Desde la vista de cocina, con un clic, se envía una alerta al grupo de Telegram:
    > *"¡RACIONES REMANENTES DISPONIBLES! Quedan ≈ 15 raciones de almuerzo por orden de llegada hasta las 13:30 con carnet físico."*
  - **Bloqueo Anti-Spam:** Para evitar saturar a los estudiantes con notificaciones repetidas, el sistema implementa un bloqueo temporal de 10 minutos entre reenvíos.

---

### 📦 MÓDULO 6: Seguridad, Control de Acceso y Costo Cero
* **Archivos clave:**
  - Reglas de Base de Datos: `firestore.rules`
  - Autenticación Backend: `worker/core.js`
  - Auth Frontend: `src/services/authService.js`
* **Lógica implementada:**
  - **RBAC (Control de Acceso Basado en Roles):** Roles `admin`, `cocina` y `recepcionista` en `admins/{uid}`.
  - **Principio de Menor Privilegio:** Las colecciones críticas (`votes`, `attendance`, `remanentes`) tienen `allow write: if false;` en `firestore.rules`. Ningún cliente web puede alterar registros por su cuenta.
  - **Firma Criptográfica RS256 en Cloudflare Worker:** El worker se comunica con Google Cloud Firestore generando tokens JWT firmados con el algoritmo RS256 usando la clave privada de una Cuenta de Servicio (Service Account) y la API nativa `crypto.subtle`. Esto permite usar el plan gratuito de Cloudflare sin pagar servidores dedicados.

---

## ❓ 4. Posibles Preguntas del Docente y Cómo Responderlas

### P1: *"¿Por qué no usaron el SDK oficial de Firestore en el frontend para todo?"*
> **Respuesta:**  
> *"La base de datos del proyecto en Firebase se denomina literalmente `default`. El canal de comunicación en tiempo real del SDK (`WebChannel`) tiene un comportamiento que asume `(default)` con paréntesis, arrojando error 404 en navegadores. Para resolverlo con máxima eficiencia y sin depender de librerías pesadas, diseñamos un cliente REST nativo (`firestoreRest.js`) con autenticación mediante el ID Token de Firebase y sondeo controlado (`pollQuery`), lo que redujo drásticamente el peso del bundle JavaScript."*

---

### P2: *"¿Qué sucede si un estudiante intenta pasar dos veces su carnet?"*
> **Respuesta:**  
> *"El sistema implementa bloqueo anti-duplicidad en dos niveles:  
> 1. **Nivel local (< 50 ms):** El caché en memoria/localStorage verifica el ID del estudiante en el conjunto de asistencias del día actual. Si ya está registrado, activa de inmediato la pantalla roja y alarma sonora de bloqueo (`ya_comio`).  
> 2. **Nivel servidor (Atómico):** El Cloudflare Worker utiliza la clave `${fecha}_${studentId}` como ID de documento en Firestore. Al usar un `fsCreate` (POST con ID fijo), si el documento ya existe, Firestore responde con un error de conflicto (409), garantizando idempotencia matemática estricta."*

---

### P3: *"¿Cómo aseguran que la cámara funcione en celulares de gama baja o computadoras con webcam?"*
> **Respuesta:**  
> *"El hook `useScanner` implementa selección adaptativa de cámara (`pickCameraDevice`): detecta los nombres de dispositivo etiquetados como 'back', 'environment' o 'trasera' para priorizar la cámara principal; y si se ejecuta en una laptop o tablet, conmuta transparentemente a la cámara frontal. Además, si el código QR físico está roto o la lente está sucia, se dispone de un campo de fallback manual por teclado."*

---

### P4: *"¿Qué justificativo social o de ingeniería tiene la inclusión del ODS 12?"*
> **Respuesta:**  
> *"En los comedores universitarios, cocinar a ciegas genera dos extremos: desabastecimiento o desperdicio masivo de comida preparada. Al digitalizar la predicción de comensales mediante votación previa, la cocina prepara solo lo necesario, registrando los kilogramos de comida salvados de la basura. Y si aún así hay un remanente no retirado, el módulo de liberación de raciones remanentes permite que otros estudiantes con necesidad nutricional aprovechen esa comida por orden de llegada antes de que se eche a perder."*

---

## 📊 5. Ficha Técnica del Proyecto

* **Lenguajes:** JavaScript (ES Modules, JSX, Node.js).
* **Frontend:** React 18, Vite 5, TailwindCSS 4, Lucide Icons, Html5Qrcode, Qrcode.react.
* **Backend:** Cloudflare Workers (V8 Isolate runtime, Web Crypto API).
* **Bases de Datos & Auth:** Google Cloud Firestore (REST v1), Firebase Authentication.
* **Testing:** Vitest (13 suites, 98 tests unitarios e integrados aprobados).
* **Zonas Horarias:** Normalizado a Bolivia (UTC-4).
