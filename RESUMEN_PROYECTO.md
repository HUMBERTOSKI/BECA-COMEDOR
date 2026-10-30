# SISTEMA WEB PARA EL CONTROL DE ACCESO MEDIANTE CÓDIGOS QR Y ESTIMACIÓN DE RACIONES EN EL COMEDOR DE LA UNIVERSIDAD AUTÓNOMA DEL BENI "JOSÉ BALLIVIÁN"

**Documento Integral de Resumen Técnico y Perfil de Proyecto de Grado**  
*Universidad Autónoma del Beni "José Ballivián" (U.A.B.J.B.) — Trinidad, Beni, Bolivia*  
*Facultad de Ingeniería y Tecnología — Carrera de Ingeniería de Sistemas*  
*Materia: Gestión de Proyectos · Docente: Willian Chao Rivero*  
*Equipo de Proyecto: Jonathan Alvaro Robles, Yassir Alexander Peña, Camila Arrazola, Humberto Orellano Justiniano, Aldair Rosas*  
*Repositorio Oficial:* [HUMBERTOSKI/BECA-COMEDOR (GitHub)](https://github.com/HUMBERTOSKI/BECA-COMEDOR.git)

---

## 📌 1. Ficha del Perfil de Proyecto

| Campo | Detalle Institucional / Académico |
|---|---|
| **Título del Proyecto** | Sistema Web para el Control de Acceso mediante Códigos QR y Estimación de Raciones en el Comedor de la Universidad Autónoma del Beni "José Ballivián" |
| **Línea de Investigación** | Tecnologías de la Información aplicadas a la Gestión Operativa y Sostenibilidad Institucional |
| **Área Temática** | Ingeniería de Software, Arquitecturas Web Progresivas (PWA), Computación Perimetral y Sistemas Offline-First |
| **Marco de Sostenibilidad** | **ODS 12: Producción y Consumo Responsables** — Meta 12.3: Reducción a la mitad del desperdicio per cápita de alimentos |
| **Beneficiarios Directos** | Estudiantes becarios del comedor universitario, personal de cocina/ecónomos, portería/mesón y Dirección de Bienestar Estudiantil |
| **Alcance Geográfico** | Campus Central y Comedor Universitario de la U.A.B.J.B., Trinidad - Beni, Bolivia |

---

## 🎯 2. Planteamiento del Problema, Hipótesis y Justificación

### 2.1 Planteamiento y Formulación del Problema
En el Comedor Universitario de la Universidad Autónoma del Beni "José Ballivián" (U.A.B.J.B.), el control de comensales becarios y la planificación de raciones se han ejecutado tradicionalmente mediante listas impresas en papel y marcación manual con bolígrafo. Este esquema manual provoca severas ineficiencias:
1. **Cuellos de botella en el mesón:** La búsqueda manual en listas de más de 400 estudiantes demora entre 18 y 35 segundos por comensal, generando filas de hasta 95 personas en horas pico (12:30 PM).
2. **Falta de información predictiva en cocina:** El equipo de cocina prepara alimentos a ciegas sin conocer cuántos becarios asistirán efectivamente, lo que genera sobreproducción con un **15% a 25% de comida sobrante** (25 a 45 kg diarios de desperdicio orgánico) o escasez imprevista.
3. **Vulnerabilidad a suplantaciones y doble ración:** Casos semanales de estudiantes que intentan ingresar dos veces o transferir carnets de terceros.
4. **Vulnerabilidad ante cortes de conectividad:** La zona del comedor experimenta caídas periódicas de red WiFi; un sistema dependiente de conexión permanente colapsaría el servicio.

> **Pregunta de Investigación:**  
> *¿De qué manera el desarrollo de un sistema web progresivo con arquitectura desacoplada, validación offline-first mediante credenciales QR y un asistente automatizado en Telegram permite agilizar el control de acceso, optimizar la estimación de raciones y reducir el desperdicio de alimentos en el comedor de la U.A.B.J.B.?*

### 2.2 Justificación del Proyecto
* **Justificación Social:** Protege el derecho de los estudiantes becarios con vulnerabilidad socioeconómica, dignificando el acceso mediante un servicio rápido, transparente y equitativo.
* **Justificación Económica:** Elimina el gasto recurrente de impresión de planillas y boletos, minimiza la merma de materias primas e insumos alimenticios en cocina y optimiza la asignación del presupuesto universitario.
* **Justificación Tecnológica:** Introduce una arquitectura moderna de **3 Capas Desacopladas (React 19 + Custom Hooks en `src/hooks/` + Cloudflare Workers)** con motor **Offline-First**, resolviendo las limitaciones de conectividad con latencias de respuesta en cliente menores a **50 milisegundos**.
* **Justificación Ambiental (ODS 12 · Meta 12.3):** Incorpora un algoritmo específico de **rescate de raciones remanentes** que cuantifica los kilogramos de alimento salvados y emite alertas a Telegram para redistribuir bandejas excedentes a becarios en lista de espera.

---

## 🏆 3. Objetivos del Proyecto

### 3.1 Objetivo General
Desarrollar e implementar un sistema web desacoplado y progresivo (PWA) con validación offline-first mediante códigos QR y asistente virtual en Telegram, para optimizar el control de acceso de becarios, estimar la demanda diaria de raciones y reducir el desperdicio de alimentos (alineado al ODS 12) en el Comedor de la Universidad Autónoma del Beni "José Ballivián".

### 3.2 Objetivos Específicos (OE)
* **OE-1:** Relevar y modelar los procesos operativos actuales de acreditación, cocción y atención del comedor mediante instrumentos cualitativos (entrevistas a profundidad) y cuantitativos (observación in situ y encuesta a becarios).
* **OE-2:** Diseñar una arquitectura de software modular y desacoplada en tres capas (Presentación, Dominio/Hooks e Infraestructura REST/Perimetral), junto al modelo de datos NoSQL seguro (RBAC) y el formato estándar de credenciales QR.
* **OE-3:** Implementar el motor de sincronización y validación *offline-first* en cliente mediante persistencia local (`localStorage`), control de cámara con `html5-qrcode` y cola de subida asíncrona idempotente.
* **OE-4:** Desarrollar el módulo de interacción externa y estimación de demanda mediante un asistente virtual en Telegram y microservicios perimetrales en Cloudflare Workers para la votación anticipada de comensales.
* **OE-5:** Construir el mecanismo de rescate de raciones remanentes alineado al ODS 12 (Meta 12.3), formulando algoritmos de cálculo de excedentes, alerta de liberación inmediata con bloqueo anti-spam y panel de métricas históricas de 10 días.
* **OE-6:** Ejecutar pruebas unitarias automatizadas (suite Vitest), pruebas de resiliencia ante cortes de red, despliegue continuo en la nube y validación piloto en las instalaciones del comedor universitario.

---

## 📊 4. Matriz Integral de Actividades por Objetivo Específico (WBS / EDT)

Las siguientes 24 actividades estructuran la totalidad del ciclo de vida del proyecto (investigación, diseño, desarrollo modular, pruebas, despliegue y validación). Esta matriz se encuentra exportada y formateada con estilos profesionales en el archivo Excel [ACTIVIDADES_Y_OBJETIVOS_PROYECTO.xlsx](file:///home/humberto/Proyectos/BECA_COMEDOR/ACTIVIDADES_Y_OBJETIVOS_PROYECTO.xlsx) y transcrita en el documento [PERFIL DE PROYECTO DE GRADO.docx](file:///home/humberto/Proyectos/BECA_COMEDOR/PERFIL%20DE%20PROYECTO%20DE%20GRADO.docx).

| Cód. | Obj. Específico | Fase | Actividad | Metodología / Descripción Operativa | Entregable Formal | Sem. |
|---|---|---|---|---|---|---|
| **ACT-1.1** | OE-1: Procesos | 1. Investigación | Entrevista con Bienestar Estudiantil | Relevar requisitos de elegibilidad, padrón de becarios, normativas de servicio, gestión de cupos y horarios. | Transcripción de entrevista y especificación de reglas de elegibilidad | Sem 1 |
| **ACT-1.2** | OE-1: Procesos | 1. Investigación | Entrevista técnica con Jefe de Cocina y Ecónomo | Levantar tiempos de preparación, fijación de menús, margen de seguridad, pesaje (kg/ración) y volumen de merma. | Ficha técnica de porciones (kg/ración) y hora límite de cocina (10:30) | Sem 1 |
| **ACT-1.3** | OE-1: Procesos | 1. Investigación | Entrevista con personal de Mesón y Portería | Analizar flujo físico de entrada, cuellos de botella en fila, verificación manual y casuística de fraudes. | Mapeo de puntos de control de acceso y riesgos de suplantación | Sem 1 |
| **ACT-1.4** | OE-1: Procesos | 1. Investigación | Encuesta diagnóstica a estudiantes becarios | Evaluar disponibilidad de smartphones, uso de Telegram, horario de votación matutina e inasistencias imprevistas. | Informe estadístico de encuesta diagnóstica a comensales | Sem 2 |
| **ACT-1.5** | OE-1: Procesos | 1. Investigación | Modelado de procesos (As-Is / To-Be) y Backlog | Formalizar diagramas de flujo BPMN y redactar Product Backlog en formato Historias de Usuario (HU). | Diagramas BPMN y Product Backlog con criterios de aceptación | Sem 2 |
| **ACT-2.1** | OE-2: Arquitectura | 2. Diseño | Arquitectura modular por capas | Diseñar separación en Capa Presentación (React 19), Capa Dominio (Custom Hooks) y Capa Infraestructura (REST/Worker). | Diagrama de arquitectura de software en 3 capas | Sem 3 |
| **ACT-2.2** | OE-2: Arquitectura | 2. Diseño | Modelado NoSQL y Reglas RBAC | Estructurar colecciones Firestore (`admins`, `students`, `menus`, `votes`, `attendance`, `remanentes`, `envios`) y `firestore.rules`. | Esquema relacional de colecciones y archivo `firestore.rules` | Sem 3 |
| **ACT-2.3** | OE-2: Arquitectura | 2. Diseño | Formato estándar de credencial QR | Definir dimensiones según ISO/IEC 7810 ID-1 (85.6 × 54 mm), fotos comprimidas, datos RU/CI y payload `BECA1:<id>`. | Plantilla gráfica de credencial y especificación de payload QR | Sem 4 |
| **ACT-2.4** | OE-2: Arquitectura | 2. Diseño | Prototipado UI/UX para 4 perfiles | Diseñar pantallas para: Administrador, Cocina (Pronóstico/Mesón), Recepción (Acceso continuo) y Telegram. | Prototipos navegables de pantallas y guía de estilos Tailwind | Sem 4 |
| **ACT-3.1** | OE-3: Mesón Offline | 3. Desarrollo | Motor de persistencia y caché local | Programar `offlineSyncService` en `localStorage` con respaldo en memoria, cacheando estudiantes y asistencias (<50 ms). | Servicio `offlineSyncService.js` probado y documentado | Sem 5 |
| **ACT-3.2** | OE-3: Mesón Offline | 3. Desarrollo | Hook modular de escaneo `useScanner` | Unificar control de hardware de cámara (`Html5Qrcode`), alternancia frontal/trasera, timeout de red (6s) y audio beeps. | Hook `src/hooks/useScanner.js` con tests unitarios | Sem 5 |
| **ACT-3.3** | OE-3: Mesón Offline | 3. Desarrollo | Cola de sincronización e idempotencia | Diseñar encolado de asistencias sin red con reintento automático y clave única `{fecha}_{studentId}` contra duplicados. | Módulo de sincronización idempotente con reintento automático | Sem 6 |
| **ACT-3.4** | OE-3: Mesón Offline | 3. Desarrollo | Interfaces de Mesón y Recepción | Construir `ScannerScreen.jsx` (Cocina) y `ReceptionistApp.jsx` (Recepción) con feedback Verde/Rojo y teclado manual. | Pantallas funcionales de validación de mesón y recepción | Sem 6 |
| **ACT-4.1** | OE-4: Telegram Bot | 3. Desarrollo | Microservicio perimetral Cloudflare Worker | Configurar Worker modular (`core.js`, `index.js`) con firma JWT RS256 para interactuar con Firestore REST sin costos. | Cloudflare Worker publicado con autenticación RS256 | Sem 7 |
| **ACT-4.2** | OE-4: Telegram Bot | 3. Desarrollo | Lógica de Bot de Estudiantes (`@becacomedorEstBOT`) | Programar menú con botones inline Sí/No para almuerzo y cena, comando `/vincular` por contacto y `/miid`. | Bot de Telegram interactivo con votación por servicio | Sem 7 |
| **ACT-4.3** | OE-4: Telegram Bot | 3. Desarrollo | Crons programados y cierre automático | Configurar crons: publicación matutina (08:00), estimado a cocina (10:30) y cierre de votaciones por minuto. | Tareas cron configuradas en `wrangler.toml` en producción | Sem 8 |
| **ACT-4.4** | OE-4: Telegram Bot | 3. Desarrollo | Módulo de gestión de menú | Construir `useMenuCalendar.js` y `MenuTab.jsx` con calendario matricial, platos, feriados y envíos diferidos (`envios`). | Componente `MenuTab.jsx` y hook `useMenuCalendar.js` | Sem 8 |
| **ACT-5.1** | OE-5: Rescate ODS 12 | 3. Desarrollo | Fórmulas de impacto ambiental ODS 12 | Implementar funciones puras de precisión porcentual, raciones excedentes y kilos salvados (0.5 kg/ración por defecto). | Módulo matemático `src/utils/remanentes.js` y `metrics.js` | Sem 9 |
| **ACT-5.2** | OE-5: Rescate ODS 12 | 3. Desarrollo | Endpoint y lógica de liberación de remanentes | Crear `/liberar-remanentes` en Worker y `useForecast.js` en React para alertar al grupo de Telegram sobre comida sobrante. | Endpoint `/liberar-remanentes` y vista `ForecastView.jsx` | Sem 9 |
| **ACT-5.3** | OE-5: Rescate ODS 12 | 3. Desarrollo | Bloqueo temporal anti-spam de 10 min | Programar temporizador reactivo que impida el reenvío de alertas repetitivas al grupo de Telegram durante 10 minutos. | Temporizador de cooldown de 10 min en `useForecast.js` | Sem 10 |
| **ACT-5.4** | OE-5: Rescate ODS 12 | 3. Desarrollo | Panel de analítica histórica de 10 días | Construir `useMetricsHistory.js` y `MetricsTab.jsx` con balance de comida servida vs desperdicio evitado. | Pestaña `MetricsTab.jsx` con tabla analítica y exportación | Sem 10 |
| **ACT-6.1** | OE-6: Pruebas & Piloto | 4. Pruebas y QA | Suite de pruebas unitarias automatizadas | Escribir y ejecutar 98 pruebas con Vitest (fechas UTC-4, QR, remanentes, reglas de menú, hooks y REST). | Suite de 98 pruebas unitarias ejecutadas con 100% éxito | Sem 11 |
| **ACT-6.2** | OE-6: Pruebas & Piloto | 4. Pruebas y QA | Pruebas de estrés y corte de conectividad | Simular cortes de red en mesón escaneando 50 carnets consecutivos, validando persistencia local y sincronización en lote. | Informe de pruebas de resiliencia y tolerancia a fallos | Sem 11 |
| **ACT-6.3** | OE-6: Pruebas & Piloto | 5. Despliegue | Despliegue continuo en producción | Publicar frontend en Firebase Hosting (HTTPS, chunks optimizados) y backend en Cloudflare Workers. | URLs activas en producción con certificados SSL | Sem 12 |
| **ACT-6.4** | OE-6: Pruebas & Piloto | 5. Validación | Prueba piloto en campo en el comedor | Ejecutar simulación real en mesón con estudiantes becarios voluntarios en almuerzo y cena; medición de tiempos. | Acta de validación de prueba piloto firmada por encargados | Sem 12 |
| **ACT-6.5** | OE-6: Pruebas & Piloto | 5. Validación | Capacitación de usuarios y manuales | Capacitar a personal de cocina, recepcionistas y administradores; redactar manuales de operación y defensa. | Manual de usuario, manual técnico y guía de defensa | Sem 12 |

---

## 📋 5. Instrumentos de Investigación y Levantamiento de Campo

Para dar sustento científico al diagnóstico y requerimientos del proyecto (Objetivo Específico 1), se han diseñado tres instrumentos formales incluidos en el libro Excel:

### 5.1 Guía de Entrevistas en Profundidad a Encargados del Comedor
*Ubicación en Excel: Hoja `Guía de Entrevistas`.*

| N° | Actor / Entrevistado | Dimensión | Pregunta de Investigación | Objetivo Metodológico |
|---|---|---|---|---|
| **ENT-01** | Administración / Bienestar Estudiantil | Padrón y Beneficiarios | ¿Cuál es el proceso formal para habilitar, suspender o dar de baja a un estudiante con beca comedor? | Identificar el ciclo de vida del estudiante y campos requeridos para el expediente digital. |
| **ENT-02** | Administración / Bienestar Estudiantil | Seguridad y Roles | ¿Quiénes son las personas autorizadas a registrar estudiantes, modificar minutas y consultar reportes? | Establecer la matriz de roles y permisos del personal (RBAC: Admin, Cocina, Recepcionista). |
| **ENT-03** | Administración / Bienestar Estudiantil | Costos y Presupuesto | ¿Qué costo asume la universidad por la impresión de boletos, planillas o credenciales extraviadas? | Fundamentar la justificación económica y el ahorro por carnet único con QR de bajo costo. |
| **ENT-04** | Jefe de Cocina / Ecónomo | Planificación de Cocción | ¿A qué hora exacta inician la preparación de los alimentos y con qué información deciden cuántas raciones cocinar? | Fijar la hora límite de corte para el cierre de votaciones en Telegram (default 10:30 AM). |
| **ENT-05** | Jefe de Cocina / Ecónomo | Margen y Porciones | ¿Cuál es el peso promedio de una ración servida y qué margen de seguridad suelen considerar por variaciones imprevistas? | Obtener la constante de conversión kg/ración (0.5 kg) y porcentaje de holgura (config general). |
| **ENT-06** | Jefe de Cocina / Ecónomo | Desperdicio y Sobrantes (ODS 12) | ¿Qué sucede con las bandejas de comida que quedan preparadas pero ningún estudiante retira? | Diagnosticar la magnitud del desperdicio y justificar la alerta de rescate de remanentes. |
| **ENT-07** | Jefe de Cocina / Ecónomo | Reglas de Fin de Semana | ¿Cómo operan los servicios los días sábados, domingos y feriados universitarios? | Formalizar reglas de negocio (almuerzo diario, cena lun-sáb para llevar, domingo sin cena). |
| **ENT-08** | Personal de Mesón / Entrega | Tiempos de Atención en Fila | ¿Cuántos segundos toma actualmente atender a un comensal en la fila de entrega de bandejas? | Medir la línea base de tiempo para contrastarla contra los < 50 ms del escaneo QR. |
| **ENT-09** | Personal de Mesón / Entrega | Casuística de Fraudes | ¿Qué problemas se presentan con estudiantes que intentan ingresar dos veces o prestar carnets ajenos? | Implementar validación visual con foto en pantalla grande y bloqueo atómico `ya_comio`. |
| **ENT-10** | Personal de Mesón / Entrega | Conectividad en Comedor | ¿Con qué frecuencia se corta el servicio de internet o WiFi en la zona del comedor durante la atención? | Relevar la criticidad del modo Offline-First para que el servicio nunca se paralice. |

### 5.2 Ficha de Observación Directa en Mesón (Línea Base vs Meta)
*Ubicación en Excel: Hoja `Fichas Campo y Encuesta` (Sección A).*

| Indicador Operativo | Unidad de Medida | Método de Medición | Valor Línea Base (Manual) | Meta con Sistema Web |
|---|---|---|---|---|
| Tiempo promedio de validación por comensal | Segundos / estudiante | Cronometraje directo en fila (50 muestras) | **18 a 35 segundos** | **< 2 segundos** (<50 ms local) |
| Longitud máxima de fila en hora pico (12:30) | Estudiantes en espera | Conteo físico en intervalo de 10 min | **60 a 95 estudiantes** | **< 15 estudiantes** |
| Desfase entre raciones cocinadas y consumidas | % sobreproducción | Balance cocinado vs bandejas servidas | **15% a 25% de sobrante** | **< 5% de margen** |
| Comida desechada al final de la jornada | Kilogramos / día | Pesaje de bandejas no retiradas en cocina | **25 a 45 kg / día** | **< 5 kg / día** (rescatables) |
| Incidencias por doble ración o suplantación | Casos / semana | Registro en libro de novedades de mesón | **12 a 20 incidentes** | **0 incidentes** (bloqueo atómico) |
| Suspensión del servicio por falla de internet | Minutos de retraso | Registro de cortes de WiFi durante el turno | **15 a 40 minutos** | **0 minutos** (modo Offline-First) |

### 5.3 Cuestionario de Encuesta Diagnóstica a Estudiantes Becarios
*Ubicación en Excel: Hoja `Fichas Campo y Encuesta` (Sección B).*

1. **P-01 (Disponibilidad Tecnológica):** ¿Dispone de un teléfono celular con conexión de datos o WiFi para recibir información? *(Dicotómica: Sí / No)*
2. **P-02 (Canal de Mensajería):** ¿Qué aplicación de mensajería utiliza con frecuencia? *(Opciones: Telegram, WhatsApp, SMS, Ninguna)*
3. **P-03 (Frecuencia de Inasistencia):** ¿Con qué frecuencia se ve imposibilitado de asistir al comedor a pesar de tener beca activa? *(Escala: Siempre, Frecuente, A veces, Raras veces, Nunca)*
4. **P-04 (Horario de Votación):** ¿A qué hora de la mañana le resulta más cómodo confirmar o declinar su asistencia? *(Rangos: 07:00-08:00, 08:00-09:00, 09:00-10:00, 10:00-11:00)*
5. **P-05 (Solidaridad y ODS 12):** ¿Estaría dispuesto a ceder su ración no consumida para que otro estudiante la aproveche mediante una alerta inmediata? *(Dicotómica: Sí / No)*
6. **P-06 (Aceptación de Carnet QR):** ¿Qué opina sobre portar una credencial física plastificada con código QR personal para ingresar sin filas? *(Escala Likert: Muy favorable a Muy desfavorable)*

---

## 📅 6. Cronograma de Ejecución Ágil (Scrum — 6 Sprints)

*Ubicación en Excel: Hoja `Cronograma de Ejecución`.*

```text
Semanas:     [01-02]   [03-04]   [05-06]   [07-08]   [09-10]   [11-12]
Sprint 0:    [█████]                                             (Investigación y Diagnóstico)
Sprint 1:              [█████]                                   (Arquitectura y Modelado)
Sprint 2:                        [█████]                         (Mesón y Motor Offline)
Sprint 3:                                  [█████]               (Bot Telegram y Crons)
Sprint 4:                                            [█████]     (Rescate ODS 12 y Métricas)
Sprint 5:                                                      [█████] (QA, Piloto y Despliegue)
```

* **Sprint 0 (Semanas 1-2):** Entrevistas a Bienestar, Cocina y Mesón; aplicación de encuestas a becarios; cronometraje de fila; diagramas BPMN y Product Backlog.
* **Sprint 1 (Semanas 3-4):** Definición de arquitectura en 3 capas; esquema NoSQL de Firestore y reglas RBAC; diseño de credencial ISO/IEC 7810 y prototipos UI/UX.
* **Sprint 2 (Semanas 5-6):** Implementación de `offlineSyncService.js`, hook `useScanner.js`, interfaces de Mesón y Recepción con validación <50 ms.
* **Sprint 3 (Semanas 7-8):** Microservicio perimetral en Cloudflare Workers con JWT RS256, Bot de Telegram (`@becacomedorEstBOT`), crons automáticos y `MenuTab.jsx`.
* **Sprint 4 (Semanas 9-10):** Algoritmos de impacto ODS 12, endpoint `/liberar-remanentes`, cooldown anti-spam de 10 min, hook `useMetricsHistory.js` y `MetricsTab.jsx`.
* **Sprint 5 (Semanas 11-12):** Ejecución de 98 pruebas Vitest, simulacro de cortes de red, despliegue continuo en Firebase y Cloudflare, prueba piloto real y manuales.

---

## 🏛 7. Arquitectura Técnica del Software (Desacoplamiento en 3 Capas)

El sistema implementa una arquitectura desacoplada y orientada a eventos para garantizar máxima modularidad, legibilidad y facilidad de sustentación ante el tribunal examinador:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA 1: PRESENTACIÓN (React 19 + UI)                 │
│  AdminDashboard · KitchenApp · ReceptionistApp · CarnetCard · Modal    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consume hooks reactivos
┌───────────────────────────────────▼────────────────────────────────────┐
│              CAPA 2: DOMINIO Y CONTROL (Hooks en src/hooks/)           │
│  useForecast.js     useScanner.js     useMenuCalendar.js     useMetrics│
│  (Cálculo ODS 12,   (Cámara hardware, (Matriz calendario,    (Tendencia│
│   cooldown 10 min,   beeps audio,      envíos diferidos,      10 días, │
│   llamada worker)    modo offline)     toggle feriados)       kg salv) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ llamadas a servicios
┌───────────────────────────────────▼────────────────────────────────────┐
│                 CAPA 3: INFRAESTRUCTURA Y SERVICIOS                    │
│  ┌─────────────────────────┐  ┌───────────────────┐  ┌──────────────┐  │
│  │   firestoreRest.js      │  │  workerClient.js  │  │offlineSync...│  │
│  │ (REST + polling en 'def'│  │ (Cloudflare Worker│  │(localStorage │  │
│  │  evita bug WebChannel)  │  │  JWT RS256 Cero $)│  │ idempotente) │  │
│  └─────────────────────────┘  └───────────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Solución a Retos Técnicos Críticos
1. **Superación del Error 404 en WebChannel de Firestore:**
   * *Problema:* En Google Cloud, la base de datos Firestore del proyecto fue bautizada literalmente como `default` (en lugar del identificador por defecto `(default)` con paréntesis). El SDK cliente estándar de Firebase intenta abrir un canal WebChannel apuntando a `(default)`, lo que arroja errores 404 permanentes en el navegador.
   * *Solución Implementada:* Se desarrolló un cliente REST ligero en `src/services/firestoreRest.js` y `firestoreService.js`. Todas las transacciones del frontend viajan por HTTP REST autenticadas con el ID Token del usuario de Firebase Auth, con un mecanismo de *polling* eficiente (`pollQuery`) para mantener las vistas actualizadas en tiempo real sin saturar la red.
2. **Arquitectura Perimetral a Costo Cero (Zero-Cost Serverless):**
   * *Problema:* El plan gratuito de Firebase (Spark) no permite desplegar Cloud Functions hacia servicios externos (como los servidores de Telegram en `api.telegram.org`).
   * *Solución Implementada:* Se migró toda la lógica de bot, webhooks y crons a un **Cloudflare Worker** gratuito (`worker/`). El worker se autentica con Firestore mediante la **Web Crypto API nativa** generando un token JWT firmado con algoritmo **RS256** derivado de una Cuenta de Servicio de Google Cloud. No requiere dependencias pesadas de Node.js ni incurre en costos mensuales.
3. **Resiliencia Operativa Offline-First (< 50 ms):**
   * *Problema:* Si se corta la conexión WiFi en el comedor durante el turno del almuerzo, los comensales no pueden quedarse esperando en la fila.
   * *Solución Implementada:* El módulo `src/services/offlineSyncService.js` descarga y cachea el padrón activo de estudiantes en `localStorage`. Al escanear un carnet, la verificación de validez y el bloqueo de duplicidad (`ya_comio`) se ejecutan en memoria y disco local en menos de **50 milisegundos**. Si no hay red, la asistencia se almacena en una cola local y se sincroniza automáticamente mediante `/validate` cuando regresa la conectividad, empleando la clave única idempotente `{fecha}_{studentId}` para evitar conteos duplicados.
4. **Módulo de Rescate de Raciones ODS 12 (Meta 12.3):**
   * *Problema:* Cuando los becarios confirman asistencia en la mañana pero no asisten al comedor antes de las 13:30, la comida queda servida y se desecha al final del turno.
   * *Solución Implementada:* El hook `src/hooks/useForecast.js` detecta la brecha entre votos afirmativos y raciones servidas. Si se detecta un excedente, el personal de cocina puede pulsar el botón **"Liberar remanentes"**, lo cual activa el endpoint `/liberar-remanentes` del Worker, notificando instantáneamente al canal de Telegram que existen porciones disponibles para retiro por orden de llegada con carnet QR. Para evitar abusos o envíos repetitivos, se implementó un temporizador de bloqueo reactivo (*cooldown*) de **10 minutos**.

---

## 📁 8. Estructura del Código Fuente del Proyecto

```text
/
├── dist/                              # Distribución optimizada para producción (Firebase Hosting)
├── src/                               # Código fuente modular de la aplicación React
│   ├── admin/                         # Vistas del perfil Administrador
│   │   ├── AdminDashboard.jsx         # Contenedor principal con navegación por pestañas
│   │   ├── CarnetTab.jsx              # Emisión, diseño e impresión masiva de carnets QR
│   │   ├── MenuTab.jsx                # Planificador de menú matricial y envíos diferidos
│   │   ├── MetricsTab.jsx             # Panel de indicadores históricos ODS 12 y exportación
│   │   └── StudentsTab.jsx            # Gestión de padrón de becarios y expedientes
│   ├── cocina/                        # Vistas del perfil Cocina
│   │   ├── KitchenApp.jsx             # Contenedor del personal de cocina
│   │   ├── ScannerScreen.jsx          # Escáner de mesón con feedback verde/rojo y sonido
│   │   └── ForecastView.jsx           # Tablero de estimación de raciones y remanentes ODS 12
│   ├── recepcion/                     # Vistas del perfil Recepción
│   │   └── ReceptionistApp.jsx        # Escáner continuo de entrada con toggle de cámaras
│   ├── auth/                          # Módulos de autenticación
│   │   └── AuthModal.jsx              # Modal de inicio de sesión con email y contraseña
│   ├── components/                    # Componentes reutilizables
│   │   └── SyncStatusBadge.jsx        # Indicador visual del estado de sincronización offline
│   ├── hooks/                         # CAPA DE CONTROL Y DOMINIO (Lógica modular)
│   │   ├── useForecast.js             # Lógica de raciones, cálculo ODS 12 y cooldown
│   │   ├── useScanner.js              # Hardware de cámara, Web Audio beeps y modo offline
│   │   ├── useMenuCalendar.js         # Cálculos de matriz de calendario y borradores de menú
│   │   └── useMetricsHistory.js       # Agregación histórica de 10 días y kilos salvados
│   ├── services/                      # CAPA DE INFRAESTRUCTURA Y COMUNICACIÓN
│   │   ├── firebase.js                # Inicialización de Firebase App y Auth
│   │   ├── firestoreRest.js           # Cliente REST nativo para Firestore (BD default)
│   │   ├── firestoreService.js        # Fachada de consultas parametrizadas con polling
│   │   ├── workerClient.js            # Cliente HTTP para endpoints de Cloudflare Worker
│   │   ├── authService.js             # Observadores de sesión y roles de usuario (RBAC)
│   │   ├── offlineSyncService.js      # Motor offline-first con localStorage y cola
│   │   └── audio.js                   # Sintetizador de beeps con Web Audio API
│   ├── utils/                         # Utilidades puras y funciones matemáticas
│   │   ├── dates.js                   # Manejo estricto de zona horaria Bolivia (UTC-4)
│   │   ├── menuRules.js               # Reglas de negocio de almuerzo, cena y feriados
│   │   ├── metrics.js                 # Fórmulas de precisión y balance de comensales
│   │   ├── remanentes.js              # Fórmulas de impacto ODS 12 y kilos rescatados
│   │   ├── qr.js                      # Generación y validación del payload 'BECA1:<id>'
│   │   ├── image.js                   # Compresión de fotografías para credencial
│   │   └── camera.js                  # Detección y alternancia de cámaras frontal/trasera
│   └── __tests__/                     # SUITE DE PRUEBAS AUTOMATIZADAS (Vitest)
│       ├── camera.test.js             # Pruebas de selección de hardware de video
│       ├── cierre.test.js             # Pruebas de cierre de votaciones en hora límite
│       ├── dates.test.js              # Pruebas de desfase y cálculos de fecha UTC-4
│       ├── envios.test.js             # Pruebas de cola de envíos diferidos
│       ├── hooks.test.js              # Pruebas de hooks modulares (useForecast, useMenu)
│       ├── metrics.test.js            # Pruebas de fórmulas de rendimiento del comedor
│       ├── offlineSync.test.js        # Pruebas de persistencia y cola sin conexión
│       ├── publicarMenu.test.js       # Pruebas de formateo de mensajes a Telegram
│       ├── qr.test.js                 # Pruebas de codificación/decodificación de QR
│       ├── remanentes.test.js         # Pruebas de fórmulas de excedentes ODS 12
│       ├── votos.test.js              # Pruebas de registro de respuestas afirmativas/negativas
│       └── worker.test.js             # Pruebas de endpoints perimetrales del Worker
├── worker/                            # BACKEND SERVERLESS (Cloudflare Worker)
│   ├── index.js                       # Enrutador principal de peticiones y webhooks
│   ├── core.js                        # Firma criptográfica JWT RS256 con Web Crypto API
│   ├── estudiantes.js                 # Comandos y respuestas del bot de estudiantes
│   ├── cocina.js                      # Envío de alertas de demanda al grupo de cocina
│   ├── meson.js                       # Endpoint /validate para escaneo de credenciales
│   ├── remanentes.js                  # Endpoint /liberar-remanentes (ODS 12)
│   └── envios.js                      # Procesamiento de mensajes programados vía crons
├── scripts/                           # SCRIPTS DE ADMINISTRACIÓN Y CONFIGURACIÓN
│   ├── integration-rest.test.js       # Prueba de integración real REST + Auth
│   ├── seed-admin.mjs                 # Creación de usuarios con roles admin/cocina/recepcion
│   ├── seed-menu.mjs                  # Poblado de minutas de prueba en la base de datos
│   ├── check-db.mjs                   # Verificación de integridad de colecciones Firestore
│   ├── set-webhook.mjs                # Configuración y rotación de webhooks con Telegram
│   └── deploy-rules-user.mjs          # Despliegue de firestore.rules hacia cloud.firestore/default
├── firestore.rules                    # Reglas de seguridad basadas en roles (RBAC)
├── wrangler.toml                      # Configuración de variables, secretos y crons del Worker
├── firebase.json                      # Configuración de hosting y rewrites para SPA
├── vite.config.js                     # Empaquetado optimizado con manualChunks (vendor/scanner)
├── ACTIVIDADES_Y_OBJETIVOS_PROYECTO.xlsx # Excel oficial con matriz WBS, entrevistas y cronograma
├── PERFIL DE PROYECTO DE GRADO.docx   # Documento oficial del Perfil de Grado actualizado
└── GUIA_EXPLICACION_DOCENTE.md        # Libreto estratégico de defensa ante tribunal docente
```

---

## 🧪 9. Suite de Pruebas Automatizadas y Aseguramiento de Calidad

El proyecto cuenta con una cobertura integral de pruebas automatizadas mediante el framework **Vitest**. La suite consta de **13 archivos de prueba** y **98 pruebas unitarias y de integración**, ejecutadas exitosamente con **100% de aprobación**:

```text
 ✓ src/__tests__/camera.test.js (8 tests)
 ✓ src/__tests__/dates.test.js (5 tests)
 ✓ src/__tests__/metrics.test.js (12 tests)
 ✓ src/__tests__/remanentes.test.js (14 tests)
 ✓ src/__tests__/publicarMenu.test.js (8 tests)
 ✓ src/__tests__/votos.test.js (4 tests)
 ✓ src/__tests__/cierre.test.js (4 tests)
 ✓ src/__tests__/worker.test.js (17 tests)
 ✓ src/__tests__/envios.test.js (5 tests)
 ✓ src/__tests__/qr.test.js (6 tests)
 ✓ src/__tests__/hooks.test.js (4 tests)
 ✓ src/__tests__/offlineSync.test.js (10 tests)
 ✓ scripts/integration-rest.test.js (1 test)

 Test Files  13 passed (13)
      Tests  98 passed (98) - 100% éxito
```

Para ejecutar la suite de pruebas localmente:
```bash
npm test
```

---

## 🚀 10. Guía de Despliegue y Enlaces de Producción

### 10.1 Comandos de Despliegue
```bash
# 1. Compilación del bundle optimizado para producción
npm run build

# 2. Despliegue del frontend en Firebase Hosting
firebase deploy --only hosting

# 3. Despliegue del backend perimetral en Cloudflare Workers
npx wrangler deploy

# 4. Despliegue de reglas de seguridad en Firestore (BD default)
node scripts/deploy-rules-user.mjs

# 5. Registro y rotación de webhooks seguros en Telegram
node scripts/set-webhook.mjs
```

### 10.2 Enlaces del Sistema en Producción
* **Portal Principal y Panel Administrativo:** [https://beca-comedor-uabjb.web.app](https://beca-comedor-uabjb.web.app)
* **Punto de Control Mesón (Cocina):** [https://beca-comedor-uabjb.web.app/#/meson](https://beca-comedor-uabjb.web.app/#/meson)
* **Punto de Control Recepción (Portería):** [https://beca-comedor-uabjb.web.app/#/recepcion](https://beca-comedor-uabjb.web.app/#/recepcion)
* **Microservicio Cloudflare Worker:** `https://beca-comedor-telegram.humbertorellano6abril.workers.dev`
* **Bot de Estudiantes:** `@becacomedorEstBOT` en Telegram

---

## 📚 11. Catálogo de Documentación y Recursos Vinculados

1. **Matriz de Actividades y Guía de Entrevistas en Excel:** [ACTIVIDADES_Y_OBJETIVOS_PROYECTO.xlsx](file:///home/humberto/Proyectos/BECA_COMEDOR/ACTIVIDADES_Y_OBJETIVOS_PROYECTO.xlsx)
   * *Hoja 1:* Matriz WBS de 24 actividades (ACT-1.1 a ACT-6.5) articuladas a OE-1..OE-6.
   * *Hoja 2:* Guía de Entrevistas a profundidad (10 preguntas cualitativas).
   * *Hoja 3:* Ficha de Observación en Mesón (Línea Base vs Meta) y Encuesta a Becarios (6 preguntas).
   * *Hoja 4:* Cronograma de Sprints Scrum (Sprints 0 a 5, 12 semanas).
2. **Perfil de Proyecto de Grado Formato Word:** [PERFIL DE PROYECTO DE GRADO.docx](file:///home/humberto/Proyectos/BECA_COMEDOR/PERFIL%20DE%20PROYECTO%20DE%20GRADO.docx)
   * Documento académico completo con título, objetivos, actividades insertadas bajo cada objetivo específico, justificación social/económica/técnica, marco teórico, metodología Scrum con WBS y bibliografía APA.
3. **Guía de Defensa ante el Tribunal Docente:** [GUIA_EXPLICACION_DOCENTE.md](file:///home/humberto/Proyectos/BECA_COMEDOR/GUIA_EXPLICACION_DOCENTE.md)
   * Libreto argumentativo con respuestas estratégicas sobre arquitectura en 3 capas, justificación del por qué de los Custom Hooks, solución al error de Firestore `default`, resiliencia offline y métricas ODS 12.
