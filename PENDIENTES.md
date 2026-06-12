# PENDIENTES — TimeKeepers AI Dashboard

> Lista viva de tareas. Conforme se completan, se marcan con `[x]` y se mueve el detalle a `AVANCES.md`.
> Para el estado general, ver `CONTEXTO_PARA_NUEVA_SESION.md`. Última actualización: **2026-06-10**.

---

## 🔴 PRIORIDAD ALTA

- [ ] **Proxy de TikTok en el servidor** — endpoint `GET /api/redes/tiktok/:slug` que lea el token guardado, llame a `open.tiktokapis.com/v2/user/info/` y devuelva los datos al dashboard (el navegador no puede por CORS). Habilita el botón "Probar conexión" de TikTok.
- [ ] **Almacenamiento seguro de tokens de redes** — mover las credenciales de `localStorage` a un archivo cifrado en el servidor (`clientes/{slug}/redes.secret.json`, AES). Que el navegador nunca vea el token crudo. Añadir a `.gitignore`.
- [ ] **PASO 5 — Link de aprobación para clientes** — `POST /api/cliente/:slug/estados/:mes/link-aprobacion` → token (7 días). Página `http://localhost:3737/aprobar?token=xxx` con la pieza + botones Aprobar/Rechazar → guarda en `estados.json`.
- [ ] **PASO 13 — Panel de Integraciones** — Search Console + Meta Ads por cliente, métricas reales en Tab Objetivos. (`website_url` ya está en identity.json.)

## 🟡 PRIORIDAD MEDIA

- [ ] **Persistencia de snapshots de redes en el servidor** — hoy el seguimiento diario vive en `localStorage`. Guardar también en `clientes/{slug}/redes-historico.json` para no perderlo si se limpia el navegador y poder graficar tendencias.
- [ ] **Gráfica de evolución en Tab Redes** — mostrar la curva de seguidores/engagement a partir de los snapshots (línea de tiempo).
- [ ] **Auto-extracción de métricas de redes** — botón que traiga insights completos (alcance, impresiones, interacciones) vía Graph API Insights, no solo seguidores, y rellene el snapshot del día automáticamente.
- [ ] **Feedback loop performance → contenido** — que los resultados de una parrilla (leads, engagement, CPL) ajusten automáticamente el brief de la siguiente. Requiere PASO 13.
- [ ] **PASO 6 — Reporte de cierre mensual** — resumen ejecutivo (piezas, objetivos vs reales, ángulos, métricas de redes) exportable a PDF. `renderResumen()` + `/api/cliente/:slug/reporte/:mes`.

## 🟢 PRIORIDAD BAJA

- [ ] **Conexión Meta Ads API** — ejecutar campañas desde el dashboard, no solo generar el prompt. Requiere PASO 13.
- [ ] **IA visual (Kling u otra)** — generar el creativo visual de las piezas dentro del flujo.

---

## 🧪 VALIDACIONES PENDIENTES

- [ ] Probar el flujo completo de Tab Redes con una cuenta real de Instagram Business (token largo).
- [ ] `objetivo_macro` en Tab Estrategia de cada cliente — si está vacío, el banner del generador muestra "sin objetivo". Rellenar antes de generar.
- [ ] Módulo SEO Web con sitios no-Wix (WordPress, Squarespace).
- [ ] Tab Objetivos con cliente nuevo que no tiene `objetivos.json`.

## 🧹 LIMPIEZA

- [x] ~~Eliminar `servidor/extract_pdf.js`~~ — hecho 2026-06-10.
- [x] ~~Eliminar backups `.v1.bak` (CLAUDE, dashboard, 3 identities)~~ — hecho 2026-06-10.
- [x] ~~Eliminar `ESTADO_PROYECTO.md`~~ — hecho 2026-06-09, contenido migrado a `AVANCES.md` y este archivo.
- [ ] (Opcional) `npm uninstall pdf-parse` en `servidor/` — quedó como devDependency sin uso tras borrar extract_pdf.js.

---

## ✅ COMPLETADO RECIENTE (se archiva en AVANCES.md)

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
