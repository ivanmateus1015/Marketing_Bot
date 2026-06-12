# AVANCES — Lo que hemos construido en TimeKeepers AI Dashboard

> Registro histórico de TODO lo realizado en el proyecto. Se agrega aquí cada vez que se completa algo.
> Para lo que falta, ver `PENDIENTES.md`. Para arrancar una sesión, ver `CONTEXTO_PARA_NUEVA_SESION.md`.
> Última actualización: **2026-06-10** (sesión 7 — Auditoría completa + sincronización del validador QA)

---

## 📊 RESUMEN DEL PROYECTO

Dashboard local de marketing para la agencia **TimeKeepers AI** (operador único: Ivan, Bogotá).
Vanilla JS + Node.js/Express. 100% local, puerto 3737. Los clientes nunca lo ven — los outputs se entregan por Drive/email.

| Componente | Estado |
|---|---|
| Dashboard base (11 tabs por cliente) | ✅ Funcionando |
| Generador de Parrilla v4.0 | ✅ Funcionando |
| Generador de Stories | ✅ Funcionando |
| Excel con estilos (exceljs) | ✅ Funcionando |
| Tab SEO Web | ✅ Funcionando |
| Tab Producción / Kanban | ✅ Funcionando |
| Tab Herramientas (6 módulos) | ✅ Funcionando |
| Tab Redes Sociales (IG/FB/TikTok) | ✅ Funcionando (MVP) |

---

## 🗓️ HISTORIAL POR SESIÓN

### Sesión 7 — 2026-06-10 — Auditoría completa + sincronización del validador QA
- ✅ **Sistema de parrilla v5 — los 9 ajustes de Ivan institucionalizados** para todos los clientes (prompt generador + validador + Excel):
  1. **Columnas HORA y PLATAFORMA** — horario fijo por formato (Reel entre semana 7PM · Carrusel 12PM · sábado 11AM) y plataforma fija (Reel → IG Reels+TikTok+FB Reels · Carrusel → IG Feed+FB, nunca carrusel a TikTok). El Excel ahora trae 17 columnas con freeze hasta FORMATO.
  2. **Objetivo único** (era dual) — la evaluación de cierre de mes es binaria. Validador avisa si ve objetivo con "/".
  3. **Máximo 2 keywords DM por parrilla** (era "cada keyword única") — las piezas del mismo eje comparten keyword; cada keyword es un flujo de automatización que mantener; >2 cubetas = atribución inservible. Validador lo marca como ERROR. Footer obligatorio: verificar flujo de respuesta antes del primer post (lección Draken).
  4. **Flags ⚠ de riesgo de producción** en el campo material: USAR SOLO ARCHIVO REAL (no fabricar evidencia) · VALIDAR CON CLIENTE + plan B (proyecto fuera de inventario) · CONSENTIMIENTO (cliente en cámara / propiedad de cliente).
  5. **Urgencia fabricada prohibida** ("orden de llegada", cupos inventados) — solo urgencia verificable. El validador la detecta como warning.
  6. **Promesas de continuidad** — "próximo video" solo si la pieza existe en la misma parrilla, con referencia temporal real.
  7. **Hashtags: exactamente 5** (1 marca + 4 ultra-nicho) — sin masivos puros (#Bogota/#Colombia) ni marca duplicada. Validador lo verifica.
  8. **Pipeline de estados de 5 etapas**: 1️⃣ Guion → 2️⃣ Producción → 3️⃣ Aprobación cliente → 4️⃣ Programado → 5️⃣ Publicado. Kanban, calendario, pills y email de aprobación migrados; estados legacy se normalizan automáticamente; datos existentes migrados (37 items de Urbex).
  9. **Semanas calendario lunes-domingo** — las piezas de sábado pertenecen a la semana de su lunes (batching de producción).
- ✅ **Regla R2 retirada del validador** (cierres "Formato A/B/C" del prompt v4.0 que ya no existen) — estaba dormida con el objetivo dual y despertó con el único, marcando como error captions correctos.
- ✅ **Parrilla Urbex v2.1** actualizada con los 9 ajustes (keywords DISEÑO + ASESORIA, flags en P1/P7/P8/P10, P10 → semana 3, fix del texto viejo en material de P1) — revalidada **10/10** y Excel regenerado con las columnas nuevas.
- ✅ **Campo "Temas a desarrollar" inteligente** (Tab Marketing, generador de parrilla). Antes partía por salto de línea (un texto de 4 temas con título+guión se convertía en 13 "temas" rotos). Ahora acepta 3 formatos: bloques `Tema 1 —…` multilínea (también pegados en la misma línea tras coma), párrafos separados por línea en blanco, o el clásico 1-línea-1-tema. Cada bloque completo = UN tema. Incluye caja de ayuda en la UI con los formatos válidos.
- ✅ **Nuevo campo "💡 Ideas sueltas"**: ideas en bruto (una por línea) que el prompt instruye a Claude a desarrollar y MEJORAR con ángulo propio (título-tesis, hook, CTA R3) — distinto de los temas obligatorios. Si hay temas, las integra; si no, reparte las piezas entre las mejores ideas.
- ✅ **Eliminado el campo "Contexto adicional"** (`genDesc`) de la UI y de toda la lógica del prompt — redundante con el campo de temas perfeccionado. El fallback a "pilares del identity" solo aparece si temas e ideas están vacíos.
- ✅ **Auditoría end-to-end del proyecto** con servidor en vivo: sintaxis de los 4 JS, validez de todos los JSON, 17 endpoints probados (todos 200), pipeline completo prompt → JSON → validador → Excel verificado con una parrilla de prueba real (score 9.2, Excel XLSX válido con freeze pane y headers).
- ✅ **Validador QA sincronizado con el schema actual del prompt** (`validarParrilla` en servidor.js). El validador exigía `nivel_produccion` y `hora_sugerida` — campos que el prompt actual PROHÍBE — generando 2 warnings falsos por pieza: una parrilla de 12 piezas nunca podía pasar de 7.6/10. Cambios:
  - `nivel_produccion`/`hora_sugerida` ya no se exigen (solo se valida `nivel_produccion` si viene, por compat con schema v4.0).
  - R3 valida `cta_keyword` (nuevo) con fallback a `cta` (viejo).
  - Las reglas evalúan el **objetivo primario** del formato dual "Conversión / Lead Gen" (R3 ahora sí aplica a piezas nuevas; antes el `===` exacto las saltaba).
  - Hashtags: solo los tags **puramente** geográficos (`#Bogota`, `#LaCalera`) deben ir al final; los compuestos nicho+geo (`#ArquitecturaBogota`) son válidos en cualquier posición. Se agregó "calera" a la regex GEO.
  - **Resultado: parrilla de junio de Urbex pasó de 7.1 (29 warnings falsos) → 10/10 (0 errores, 0 warnings).** Parrillas viejas de Draken siguen validando igual (sin regresiones).
- ✅ **Fix SEO audit**: cargaba el identity desde `clientes/{slug}/identity.json` (ruta inexistente) → corregido a `00-identity/identity.json`. El prompt de auditoría profunda ahora sí recibe el contexto del cliente.
- ✅ **Confirmado en vivo**: urbexad.com sigue con `robots: noindex` + sin meta description + sin H1 — pendiente corregir en el panel de Wix (tarea de Ivan).
- ✅ **Limpieza**: eliminados `servidor/extract_pdf.js`, `CLAUDE.v1.bak.md`, `dashboard.v1.bak.html`, 3× `identity.v1.bak.md` y el `package-lock.json` vacío de la carpeta raíz.
- 📝 Nota: el Excel de parrillas con schema actual trae **1 hoja** (Parrilla). Las hojas Guía de Producción / Banco de Material solo se generan si el JSON trae esos campos (schema viejo — el prompt actual los prohíbe).
- 📝 Decisión: los identity incompletos de maria-fernanda y timekeepers-ai quedan en espera — los clientes no han enviado su info. Foco actual: **Urbex**.

### Sesión 6 — 2026-06-09 — Tab Redes Sociales + Tab Seguimiento + reorganización de docs
- ✅ **Nueva pestaña "🔎 Seguimiento"** (análisis de cuentas con Claude). Lee los snapshots del Tab Redes, calcula crecimiento y engagement promedio por red con semáforo vs benchmark, y genera un **prompt de análisis** completo para pegar en Claude.
- ✅ El prompt entrega: diagnóstico vs benchmark, qué funcionó / qué no, y planes accionables para **más seguidores, más leads calificados y más clientes**, con plan de acción a 30 días y métricas a vigilar. Anclado al buyer persona y diferenciadores del identity.
- ✅ Inputs: periodo (30/90 días), objetivos (seguidores/leads/clientes), lista de publicaciones con su desempeño, y contexto cualitativo.
- ✅ Benchmarks 2026 integrados (engagement 1-3/3-6/6%+, carruseles 2-3× guardados, ventanas 30/90 días).
- ✅ **Nueva pestaña "📲 Redes"** en el dashboard (entre SEO y Herramientas).
- ✅ Tarjetas de configuración de credenciales por plataforma: **Instagram, Facebook, TikTok**. Guardan token + IDs por cliente en `localStorage`.
- ✅ **"Probar conexión" en vivo** para Instagram y Facebook (llamada real a Meta Graph API v23 desde el navegador). Muestra seguidores, publicaciones, nombre de página.
- ✅ TikTok: registro manual + nota de que requiere proxy en servidor (CORS).
- ✅ **Tabla de seguimiento diario**: registra fecha · red · seguidores · alcance · interacciones; calcula engagement % automático. Persistencia en `localStorage` por cliente.
- ✅ Botón "→ Llevar a seguimiento" que precarga el snapshot con los datos traídos por la API.
- ✅ **Banner de seguridad**: explica por qué NO se usa usuario/contraseña.
- ✅ Creado **`MANUAL_CONEXION_REDES.md`** — guía paso a paso para obtener tokens de IG, FB y TikTok, qué datos se pueden extraer, MCPs de referencia y notas de seguridad.
- ✅ **Reorganización de documentación**: se separó el seguimiento en tres archivos → `CONTEXTO_PARA_NUEVA_SESION.md` (entrada), `PENDIENTES.md` (checklist), `AVANCES.md` (este archivo). Se eliminó `ESTADO_PROYECTO.md` (su contenido se migró a estos dos).
- ✅ **Fix:** la primera pestaña (Cliente) ya carga su información al abrir el dashboard sin tener que refrescar. Causa: `activeTab` inicializaba en `'resumen'` mientras el HTML mostraba `identity`. Corregido a `'identity'`.

### Sesión 5 — 2026-06-02/08 — Validación schema v4.0 + parrilla Urbex
- ✅ Parrilla de Urbex generada y validada con schema v4.0 (3 piezas, score 9.4/10; luego parrilla completa de 12 piezas, score 9.3/10).
- ✅ Bugs de QA corregidos en el prompt generador:
  - R2 aplica a TODOS los formatos con objetivo=Conversión.
  - `keyword_dm = null` obligatorio en piezas Awareness.
  - R3 CTA no mezcla Awareness/Conversión.
  - Hashtags geográficos siempre al final.
  - `auto_qa` debe citar frase literal de R2.
- ✅ **`identityCache`** precarga la identidad al abrir Tab Marketing (fix del bug de brief score 0/10).
- ✅ Incorporadas 8 reglas universales de contenido a la parrilla de Urbex (independencia de material, scope mensual, hashtags rotativos, urgencia coordinada, diferenciador en 10/12 piezas).

### Sesión 4 — 2026-06-02 — Overhaul schema de parrilla + Excel con estilos
- ✅ **Schema de parrilla v4.0**: campo `caption` → `caption_post` (máx 60/80/50 palabras según formato); nuevo `copy_slides` (array para diseñador, obligatorio en carruseles); nuevos `keyword_dm`, `nivel_produccion`, `hora_sugerida`, `brief_diseñador`.
- ✅ Regla **R10** — integridad obligatoria de `copy_slides`.
- ✅ Tabla de roles válidos en `copy_slides` (Gancho / Desarrollo / Clímax / CTA).
- ✅ 3 nuevos anti-patrones; R2 y R9 actualizados para `caption_post`.
- ✅ **Excel reescrito con exceljs** (reemplaza xlsx para generación con estilos): header vino tinto `#722F37`, freeze pane, wrap text, columnas ajustadas, filas SEMANA estilizadas. Backward compat con parrillas viejas.
- ✅ **Skills precargadas**: el paquete "Parrilla Feed" (7 skills) se carga solo al abrir Tab Marketing.
- ✅ **Campo "Ideas o temas"**: distribución equitativa de temas entre piezas.
- ✅ **Objetivo simplificado**: el generador usa solo `objetivo_macro` del mes.
- ✅ Análisis MVP vs sistema actual (documento de referencia del cliente).

### Sesiones 1–3 — Base del sistema (PASOS completados)
- ✅ Dashboard base: selector de clientes, tabs por cliente, score de identidad 0-10, sidebar, auto-refresh vía file watcher (chokidar), tab badges dinámicos.
- ✅ Tab Estrategia/Objetivos: objetivo macro, tabla semanal, 6 KPIs con semáforo, mix de contenido, exportar Excel.
- ✅ Tab SEO Web: análisis HTML real (captura 300KB), checklist 14 puntos, score 0-100, plan priorizado.
- ✅ Tab Producción/Material: Kanban 4 columnas, explorador de archivos con modal, barra % publicado.
- ✅ Tab Herramientas: Ideas de Marketing, Customer Research, CRO Web, AI CEO, Excel Master, Reporte.
- ✅ Generador de Stories (5 slides mínimo, reglas RS1–RS9-B).
- ✅ Generadores: Amplificación, Paid Ads, Captación, Ventas, Medición.
- ✅ Importación de identity y plan mensual desde Excel (xlsx).

---

## 🧱 ARQUITECTURA (referencia)

| Archivo | Qué es | Tamaño aprox |
|---|---|---|
| `dashboard.html` | Frontend completo — vanilla JS, sin frameworks | ~6.540 líneas |
| `servidor/servidor.js` | Backend Node.js/Express — 44 endpoints | ~2.000 líneas |
| `CLAUDE.md` | Cerebro operativo — reglas, schemas, anti-patrones | ~580 líneas |
| `MANUAL_CONEXION_REDES.md` | Guía de conexión de redes sociales | nuevo |
| `clientes/{slug}/` | Carpeta por cliente (identity, historial, objetivos, estados) | — |
| `.claude/skills/` | 41 skills de marketing | — |
| `data/data.json` | Cache auto-generado por el servidor | auto |

**Stack servidor:** express · cors · body-parser · multer · **xlsx** (parsing) · **exceljs** (generación con estilos) · chokidar (watcher) · pdf-parse.

**Clientes activos:** `urbex-architecture` (canario, Deluxe) · `draken-vip` (Deluxe, Miami) · `maria-fernanda` (Estándar) · `timekeepers-ai` (interno).

---

## 🏛️ DECISIONES DE ARQUITECTURA (no cambiar sin razón)

1. `caption_post` + `copy_slides` reemplazan a `caption`. Fallback: `p.caption_post || p.caption || ''`.
2. **exceljs** para generar Excel con estilos; **xlsx** solo para parsear. No mezclar.
3. Todos los clientes acceden a los 41 skills (no se discrimina por plan en código).
4. Rutas siempre `clientes/{slug}/` (no `clients/{clientId}/`).
5. Servidor siempre desde **PowerShell de Windows** (bash/WSL no resuelve DNS de Wix/CDN).
6. Captura HTML para SEO: 300KB mínimo.
7. `objetivos.json` y `estados.json` viven en `clientes/{slug}/` (no en subcarpetas).
8. `website_url` se guarda en `identity.json` como campo extra.
9. Tab Marketing carga el paquete "Parrilla Feed" por defecto si no hay paquete activo.
10. El generador usa solo `objetivo_macro` (no el detalle semanal).
11. **Redes (nuevo):** conexión por **token de API**, nunca usuario/contraseña. Credenciales en `localStorage` por cliente (MVP) → migrar a servidor cifrado en producción.
