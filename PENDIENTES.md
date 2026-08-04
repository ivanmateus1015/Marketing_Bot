# PENDIENTES — TimeKeepers AI Dashboard

> Lista viva de tareas. Conforme se completan, se marcan con `[x]` y se mueve el detalle a `AVANCES.md`.
> Para el estado general, ver `CONTEXTO_PARA_NUEVA_SESION.md`. Última actualización: **2026-07-29**.
> Auditoría de conexión completa y pruebas end-to-end: ver **`INFORME_CONEXION.md`**.

---

## 🔴 PRIORIDAD ALTA

- [x] ~~**Proxy de TikTok en el servidor**~~ — hecho 2026-07-29: `GET /api/redes/:plataforma/:slug/probar` cubre `ig`, `fb` y `tt` con el mismo contrato. El botón "Probar conexión" ya funciona en las tres.
- [ ] **Cifrar los tokens en disco (AES)** — parcialmente resuelto 2026-07-29: los tokens salieron de `localStorage`, viven en `clientes/{slug}/redes.json` (ya en `.gitignore`) y el servidor nunca los devuelve al navegador. Falta cifrarlos en reposo con clave en `.env`.
- [ ] **PASO 5 — Link de aprobación para clientes** — `POST /api/cliente/:slug/estados/:mes/link-aprobacion` → token (7 días). Página `http://localhost:3737/aprobar?token=xxx` con la pieza + botones Aprobar/Rechazar → guarda en `estados.json`.
- [ ] **PASO 13 — Panel de Integraciones** — Search Console + Meta Ads por cliente, métricas reales en Tab Objetivos. (`website_url` ya está en identity.json.)

## 🟡 PRIORIDAD MEDIA

- [x] ~~**Persistencia de snapshots de redes en el servidor**~~ — hecho 2026-07-29: `clientes/{slug}/redes.json` + endpoints POST/DELETE de snapshot. Un registro por fecha+red. Ya alimentan el Tab Resumen y el Excel Master.
- [ ] **Gráfica de evolución en Tab Redes** — mostrar la curva de seguidores/engagement a partir de los snapshots (línea de tiempo). *Los datos ya están en el servidor (`/api/cliente/:slug/redes` devuelve `stats`); falta solo dibujarlos.*
- [ ] **Auto-extracción de métricas de redes** — botón que traiga insights completos (alcance, impresiones, interacciones) vía Graph API Insights, no solo seguidores, y rellene el snapshot del día automáticamente.
- [ ] **Feedback loop performance → contenido** — que los resultados de una parrilla (leads, engagement, CPL) ajusten automáticamente el brief de la siguiente. Requiere PASO 13.
- [ ] **PASO 6 — Reporte de cierre mensual en PDF** — el reporte ya existe y funciona (Herramientas → Reporte Mensual, con texto de WhatsApp e impresión). Falta la exportación a PDF con plantilla propia. *Corregido 2026-07-29: leía una clave inexistente del historial y siempre reportaba 0 piezas.*

## 🟢 PRIORIDAD BAJA

- [ ] **Conexión Meta Ads API** — ejecutar campañas desde el dashboard, no solo generar el prompt. Requiere PASO 13.
- [ ] **IA visual (Kling u otra)** — generar el creativo visual de las piezas dentro del flujo.

---

## 🧪 VALIDACIONES PENDIENTES

- [ ] Probar el flujo completo de Tab Redes con una cuenta real de Instagram Business (token largo).
- [ ] `objetivo_macro` en Tab Estrategia — falta en `draken-vip`, `lunamarte` y `maria-fernanda` (no tienen `objetivos.json`). Verificado 2026-07-29 con `scripts/probar-pestanas.sh`.
- [ ] Módulo SEO Web con sitios no-Wix (WordPress, Squarespace).
- [x] ~~Tab Objetivos con cliente nuevo sin `objetivos.json`~~ — resuelto 2026-07-29: `/api/cliente/nuevo` ya crea el scaffold de objetivos, estados, leads y redes.
- [ ] **`timekeepers-ai` no tiene `identity.json`** — única prueba que falla en todo el sistema.

## 🧹 LIMPIEZA

- [x] ~~Eliminar `servidor/extract_pdf.js`~~ — hecho 2026-06-10.
- [x] ~~Eliminar backups `.v1.bak` (CLAUDE, dashboard, 3 identities)~~ — hecho 2026-06-10.
- [x] ~~Eliminar `ESTADO_PROYECTO.md`~~ — hecho 2026-06-09, contenido migrado a `AVANCES.md` y este archivo.
- [ ] (Opcional) `npm uninstall pdf-parse` en `servidor/` — quedó como devDependency sin uso tras borrar extract_pdf.js.

---

## ✅ COMPLETADO RECIENTE (se archiva en AVANCES.md)

### Sesión 8 — 2026-07-29 · Auditoría de conexión (detalle en `INFORME_CONEXION.md`)
- [x] **Fix: Tab Producción no mostraba stories ni reels** — el scan de `/archivos` usaba `return` en vez de `continue` y abortaba tras la primera subcarpeta.
- [x] **Fix: Excel Master hoja Identity vacía** — leía `identity.nombre` en vez de los códigos de schema (`A`, `B`, `W`…). Ahora vuelca los 47 campos.
- [x] **Fix: Excel Master hoja Historial siempre en 0** — regex de un formato que ningún `_historial.md` usa. Ahora reusa `leerHistorial()`.
- [x] **Fix: Reporte Mensual reportaba 0 piezas** — leía `rHist.historial` (la clave es `bitacora`) y `p.angulo` (es `angulos`).
- [x] **Fix: leads creados por API quedaban fuera de los filtros** — defaults `Nuevo`/`Instagram DM` alineados a `Nuevo Lead`/`Instagram`.
- [x] **Tab Resumen conectado** — nuevo `GET /api/cliente/:slug/resumen`; antes solo leía el snapshot estático de `data.js`.
- [x] **Botón ➕ Nuevo cliente** — `/api/cliente/nuevo` existía pero ninguna pantalla lo llamaba; ahora además crea el identity semilla y todos los scaffolds.
- [x] **Nuevas hojas en Excel Master** — Leads y Redes.
- [x] **Script de pruebas** `scripts/probar-pestanas.sh` — golpea los endpoints de las 12 pestañas para cualquier cliente.
- [x] **Cliente ficticio `aurora-bakehouse`** — datos completos en las 12 pestañas para validar el sistema (borrable con `rm -rf clientes/aurora-bakehouse`).

- [x] **Validador QA sincronizado con el schema actual del prompt** — eliminados los warnings falsos de `nivel_produccion`/`hora_sugerida`, R3 valida `cta_keyword` y objetivo dual, hashtags nicho+geo ya no penalizan. Parrilla de junio pasó de 7.1 → 10/10 — sesión 7.
- [x] **Fix SEO audit** — ahora carga el identity desde `00-identity/identity.json` (antes siempre llegaba null) — sesión 7.
- [x] **Validación end-to-end del pipeline** prompt → JSON → validador → Excel, con servidor en vivo — sesión 7.
- [x] **Tab Seguimiento de Redes** — análisis de cuentas con Claude (diagnóstico + plan para más seguidores/leads/clientes) — sesión 6.
- [x] **Tab Redes Sociales (IG/FB/TikTok)** con config de tokens, prueba de conexión en vivo (IG/FB) y seguimiento diario — sesión 6.
- [x] **Manual de conexión de redes** (`MANUAL_CONEXION_REDES.md`) — sesión 6.
- [x] **Reorganización de docs** en CONTEXTO / PENDIENTES / AVANCES — sesión 6.
- [x] **Fix carga de primera pestaña** al abrir el dashboard — sesión 6.
- [x] **Parrilla Urbex 12 piezas** schema v4.0 con 8 reglas universales, score 9.3/10 — sesión 5.
- [x] **Schema parrilla v4.0** (`caption_post` + `copy_slides` + campos nuevos) — sesión 4.
- [x] **Excel con estilos (exceljs)** — sesión 4.
- [x] **Skills precargadas + campo Ideas** en el generador — sesión 4.
