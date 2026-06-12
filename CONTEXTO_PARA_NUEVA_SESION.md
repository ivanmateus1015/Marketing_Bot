# CONTEXTO PARA NUEVA SESIÓN — TimeKeepers AI Dashboard
> Actualizado: 2026-06-10 | Leer este archivo COMPLETO antes de cualquier acción. Es la puerta de entrada al proyecto.

> **Mapa de documentación (3 archivos):**
> - **Este archivo** — qué es el proyecto y cómo arrancar.
> - **`PENDIENTES.md`** — lista viva de tareas (se tachan al completarse).
> - **`AVANCES.md`** — todo lo que ya se construyó, sesión por sesión.
> - *(`ESTADO_PROYECTO.md` fue eliminado el 2026-06-09; su contenido vive ahora en PENDIENTES y AVANCES.)*

---

## ¿QUÉ ES ESTO?

**TimeKeepers AI** es una agencia de marketing digital operada en solitario por **Ivan** (Bogotá, Colombia). Ivan actúa simultáneamente como founder, CTO y operador único.

Este repositorio es el **dashboard de operación interna** de la agencia. Los clientes **nunca** ven este sistema. Ivan lo usa para producir todos los outputs (parrillas de contenido, stories, ads, reportes) y luego los entrega a los clientes por Google Drive o email.

El sistema NO es una app pública. Es una herramienta local de productividad para un solo operador.

---

## DÓNDE ESTÁ TODO

```
c:\Users\IvanEstebanMateusSoc\Documents\Ivan\Claude\BOT MAESTRO MARKETING\timekeepers-workspace\
```

| Archivo / Carpeta | Qué es | Tamaño actual |
|---|---|---|
| `dashboard.html` | Frontend completo — vanilla JS, sin frameworks | ~6.540 líneas |
| `servidor/servidor.js` | Backend Node.js/Express — todos los endpoints | ~2.000 líneas (44 endpoints) |
| `CLAUDE.md` | Cerebro operativo — reglas, schemas, anti-patrones | ~580 líneas |
| `ESTADO_PROYECTO.md` | Estado de construcción detallado por sesión | ~330 líneas |
| `clientes/{slug}/` | Una carpeta por cliente con toda su info | — |
| `clientes/{slug}/00-identity/identity.json` | Datos de identidad del cliente (JSON) | — |
| `clientes/{slug}/_historial.md` | Registro cronológico de producción | — |
| `clientes/{slug}/objetivos.json` | Objetivos mensuales del cliente | — |
| `clientes/{slug}/estados.json` | Estados de producción Kanban | — |
| `.claude/skills/` | 41 skills de marketing instaladas | — |
| `data/data.json` | Cache del dashboard (auto-generado por el servidor) | auto |
| `scripts/actualizar-dashboard.js` | Script que regenera data.json manualmente | — |

---

## CÓMO INICIAR EL SERVIDOR

```powershell
# SIEMPRE desde PowerShell de Windows — NUNCA desde bash/WSL
cd "c:\Users\IvanEstebanMateusSoc\Documents\Ivan\Claude\BOT MAESTRO MARKETING\timekeepers-workspace\servidor"
node servidor.js
```

**URL:** `http://localhost:3737/dashboard.html`  
**Puerto:** 3737

> bash/WSL no resuelve bien el DNS de Wix/CDN — el módulo SEO falla. Usar PowerShell.

---

## CLIENTES ACTIVOS

| Slug | Nombre real | Plan | Mercado | identity.json |
|------|-------------|------|---------|---------------|
| `urbex-architecture` | Urbex Architecture & Design SAS | Deluxe | Bogotá | ✅ Existe |
| `draken-vip` | Draken VIP Limousine | Deluxe | Miami (EN/ES) | ✅ Existe |
| `maria-fernanda` | Maria Fernanda | Estándar | Colombia | ✅ Existe |
| `timekeepers-ai` | TimeKeepers AI | Casa (interno) | Bogotá | ❌ Sin identity.json |

**Cliente canario (prueba de todas las features nuevas):** `urbex-architecture`  
- Web: https://www.urbexad.com/ (Wix — tiene `robots: noindex` activo, urgente corregir)

**Planes comerciales:**
- Plan Estándar: $900 USD/mes — 10 skills core
- Plan Deluxe: $1.500 USD/mes — 41 skills completas
- En la práctica, todos los clientes acceden a los 41 skills (decisión de arquitectura tomada)

---

## STACK TÉCNICO

**Servidor:**
- Node.js / Express, cors, body-parser, multer
- `xlsx` v0.18.5 — *solo* para parsear Excel entrante (importar identity/plan)
- `exceljs` — *solo* para generar Excel con estilos (parrilla, stories)
- `chokidar` — file watcher que auto-regenera data.json y recarga el dashboard
- `pdf-parse@1.1.1` — devDependency sin uso (su único consumidor, extract_pdf.js, se eliminó 2026-06-10; desinstalar cuando se quiera)

**Frontend:**
- Vanilla JS puro. Sin frameworks. Sin bundlers.
- Una sola página: `dashboard.html`

**Agencia (no en este repo):**
- n8n 2.10.4 self-hosted
- Perplexity (sonar / sonar-pro)
- Gemini 2.5 Pro
- Google Sheets

---

## QUÉ HAY CONSTRUIDO Y FUNCIONANDO

### Dashboard base
- Selector de clientes en el header + sidebar
- **12 tabs por cliente:** Cliente / Estrategia / Contenido / Producción / Calendario / Leads / Resumen / Historial / SEO / **Redes** / **Seguimiento** / Herramientas
- Score de identidad visual (0-10) por cliente
- Tab badges dinámicos (✓ verde en Objetivos cuando completo, número ámbar en Material)
- Auto-refresh cuando el servidor detecta cambios en archivos

### Tab Marketing / Contenido (generadores de prompts)
- **Generador de Parrilla** — el más importante:
  - Skills "Parrilla Feed" precargadas automáticamente al abrir el tab (sin clic)
  - Campo "Ideas o temas" con distribución equitativa entre piezas
  - Objetivo macro del mes inyectado desde Tab Estrategia
  - Schema v4.0: `caption_post`, `copy_slides`, `keyword_dm`, `nivel_produccion`, `hora_sugerida`
  - QA automático con 10 reglas (R1–R10), score mínimo 9.0
  - Pipeline completo: prompt → JSON → Excel con estilos automáticos
- **Generador de Stories** (5 slides mínimo, QA RS1–RS9-B)
- **Generadores adicionales:** Amplificación, Paid Ads, Captación, Ventas, Medición
- Selector de paquetes de skills: Parrilla Feed / Feed+Reels / Campaña-Evento / Paid / Ideas
- Brief scoring (0-10) basado en campos de identity antes de generar

### Tab Estrategia / Objetivos
- Objetivo macro del mes (texto libre, editable)
- Tabla semanal (foco, KPI, CTA, éxito)
- 6 KPIs meta con barras y semáforo de colores
- Mix de contenido editable (Awareness / Conversión / Educación)
- Exportar Excel de objetivos

### Tab SEO Web
- Análisis HTML real de la URL del cliente (captura 300KB mínimo)
- Checklist 14 puntos, score 0-100
- Plan de mejoras priorizado (rojo/amarillo/verde)
- Prompt de auditoría profunda

### Tab Producción / Material
- Kanban 4 columnas: Borrador / En revisión / Aprobado / Publicado
- Explorador de archivos JSON/Excel con modal full-screen
- Barra % publicado

### Tab Herramientas (6 sub-módulos)
- Ideas de Marketing · Customer Research · CRO Web · AI CEO · Excel Master · Reporte

### Excel de parrilla (exceljs)
- Schema actual: **1 hoja** (Parrilla). Las hojas extra (Guía de Producción / Banco de Material / etc.) solo se generan si el JSON trae esos campos — el prompt actual los prohíbe, así que solo aparecen en parrillas viejas.
- Header vino tinto `#722F37`, texto blanco bold
- Primera fila congelada (freeze pane) en todas las hojas
- Wrap text, columnas ajustadas, filas SEMANA estilizadas

---

## ESTADO REAL DE LA ÚLTIMA SESIÓN (sesión 7 — 2026-06-10)

### Lo que se hizo en sesión 7:
- Auditoría end-to-end completa: servidor probado en vivo (17 endpoints OK), pipeline prompt → JSON → validador → Excel verificado.
- **Validador QA sincronizado con el schema actual**: ya no exige `nivel_produccion`/`hora_sugerida` (el prompt los prohíbe), R3 valida `cta_keyword` y objetivo dual, hashtags nicho+geo (`#ArquitecturaBogota`) ya no penalizan. La parrilla de junio pasó de 7.1 → **10/10**.
- **Fix SEO audit**: ahora carga el identity desde `00-identity/identity.json` (antes llegaba null).
- Limpieza: extract_pdf.js, backups `.v1.bak` y package-lock raíz eliminados.
- Confirmado en vivo: **urbexad.com sigue con `robots: noindex`** — corregir en Wix (tarea de Ivan, urgente).
- Identities de maria-fernanda y timekeepers-ai siguen incompletos a la espera de info de los clientes. **Foco actual: Urbex.**

### Última parrilla generada:
`clientes/urbex-architecture/01-contenido/parrillas/parrilla-2026-06-08-18-08.json` (12 piezas, score 10/10 con el validador sincronizado)

---

## LO QUE ESTÁ PENDIENTE

> La lista completa y viva vive en **`PENDIENTES.md`**. Resumen de lo más urgente:

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | **Proxy TikTok** en el servidor (habilita "Probar conexión" de TikTok) | ALTA |
| 2 | **Almacenamiento seguro de tokens** de redes (cifrado en servidor) | ALTA |
| 3 | **PASO 5** — Links de aprobación para clientes (token 7 días) | ALTA |
| 4 | **PASO 13** — Panel de Integraciones (Search Console + Meta Ads) | ALTA |
| 5 | **Feedback loop** — performance real → ajuste de contenido | Media |
| 6 | **PASO 6** — Reporte de cierre mensual (PDF exportable) | Media |

### Diseño del PASO 5 (link aprobación):
```
POST /api/cliente/:slug/estados/:mes/link-aprobacion → devuelve token
URL: http://localhost:3737/aprobar?token=xxx
Página simple: muestra pieza + botones Aprobar/Rechazar → guarda en estados.json
```

---

## BUGS / VALIDACIONES PENDIENTES

| Estado | Descripción |
|--------|-------------|
| ⚠️ VALIDAR | `objetivo_macro` en Tab Estrategia de cada cliente — si está vacío, el banner del generador muestra "sin objetivo". Rellenar antes de generar. |
| ⚠️ VALIDAR | Módulo SEO Web con sitios no-Wix (WordPress, Squarespace) |
| ⚠️ VALIDAR | Tab Objetivos con cliente nuevo sin `objetivos.json` — el endpoint responde bien (probado 2026-06-10), falta validar la UI |
| 🔴 URGENTE | urbexad.com con `robots: noindex` — Google no indexa la web del cliente. Corregir en panel de Wix (+ falta meta description, H1, imagen OG) |

---

## SCHEMA PARRILLA v5 (resumen ejecutivo — actualizado 2026-06-10)

```json
{
  "hora": "7:00 PM (Reel entre semana) · 12:00 PM (Carrusel) · 11:00 AM (sábado)",
  "plataforma": "Reel: IG Reels + TikTok + FB Reels · Carrusel: IG Feed + FB",
  "objetivo": "UNO solo: Awareness | Engagement | Trust | Lead Gen | Conversión",
  "caption_post": "≤60 palabras Reel · ≤50 Carrusel — texto del POST",
  "copy_slides": "string: 'N slides — razón. S1[Gancho]...' (solo Carrusel; N/A en Reel)",
  "keyword_dm": "una de MÁXIMO 2 keywords por parrilla (null en Awareness/Engagement/Trust)",
  "material": "proyecto + momento + prueba del claim. Flags ⚠ cuando aplique",
  "estado": "1️⃣ Guion (pipeline: Guion → Producción → Aprobación cliente → Programado → Publicado)"
}
```

**Reglas duras v5 (ajustes de Ivan, sesión 7):**
1. Máximo **2 keywords DM** por parrilla — piezas del mismo eje comparten keyword. Verificar el flujo de respuesta ANTES del primer post.
2. **Objetivo único** por pieza (nunca dual) — evaluación binaria al cierre.
3. **Hashtags: exactamente 5** (1 marca + 4 ultra-nicho). Sin #Bogota/#Colombia puros.
4. **Urgencia solo verificable** — prohibido "orden de llegada" y cupos inventados.
5. **Flags ⚠** en material: archivo real / validar con cliente + plan B / consentimiento.
6. Semanas **lunes a domingo** (batching de producción).
7. `caption_post` = community manager · `copy_slides` = diseñador. NUNCA mezclarlos.

---

## DECISIONES DE ARQUITECTURA (no cambiar sin razón)

1. `caption_post` + `copy_slides` reemplazan a `caption` en todo el sistema. Backward compat: `p.caption_post || p.caption || ''`
2. `exceljs` para generar Excel con estilos. `xlsx` solo para parsear Excel entrante. No mezclar para generación.
3. Todos los clientes tienen acceso a los 41 skills (no se discrimina por plan en el código).
4. Rutas siempre: `clientes/{slug}/` (no `clients/{clientId}/`).
5. Servidor: siempre PowerShell de Windows. Nunca bash/WSL.
6. Captura de HTML para SEO: 300KB mínimo (Wix pone meta tags a 100KB+).
7. `objetivos.json` y `estados.json` viven en `clientes/{slug}/` (no en subcarpetas).
8. `website_url` se guarda en `identity.json` como campo extra fuera del schema estándar.
9. Skills precargadas por defecto: Tab Marketing carga "Parrilla Feed" automáticamente si no hay paquete activo.
10. Generador usa solo `objetivo_macro` del mes (no el detalle semanal — ese es para seguimiento, no para generar).

---

## REFERENCIAS RÁPIDAS DE CÓDIGO

### Agregar un tab nuevo al dashboard
1. Botón en `<nav class="client-tabs">` (~línea 536 de dashboard.html)
2. `<div class="tab-panel" id="tab-{nombre}">` tras los otros panels
3. Actualizar array `tabs` en `setTab()` (~línea 849)
4. Agregar `case '{nombre}': render{Nombre}(); break;` en `renderCurrentTab()`
5. Crear función `render{Nombre}()` en el JS

### Agregar un endpoint al servidor
Insertar antes del bloque `// ── File watcher ──` al final de `servidor.js`.

### Estructura mínima objetivos.json
```json
{
  "mes_activo": "2026-06",
  "meses": {
    "2026-06": {
      "mes": "2026-06",
      "objetivo_macro": "Texto del objetivo general del mes",
      "objetivos": { "seguidores": 150, "leads": 8 },
      "mix_contenido": { "Awareness": 50, "Conversion": 35, "Educacion": 15 },
      "semanas": [{ "numero": 1, "foco": "", "kpis": "", "cta_semana": "", "resultados_reales": {} }],
      "resultados_reales": {},
      "notas": ""
    }
  }
}
```

---

## REGLAS DE COMPORTAMIENTO PARA CLAUDE

Estas reglas vienen del CLAUDE.md del workspace y aplican en toda sesión:

1. **Antes de cualquier output para un cliente:** leer `identity.json` → leer `_historial.md` → revisar outputs previos. Sin cumplir estos 3 pasos, no generar nada.
2. **Score mínimo aceptable:** 9.0/10. Si el output no llega, avisar antes de entregar. No silenciar.
3. **Idioma:** siempre español, salvo que el contexto del cliente sea explícitamente inglés (Draken VIP puede requerir inglés para mercado USA).
4. **n8n:** nunca usar `new Set()` (incompatible con v2.10.4). Expresiones: `{{ $json["Campo"] }}` sin escapes.
5. **No crear archivos fuera de la estructura definida** sin confirmación de Ivan.
6. **Paleta de marca TimeKeepers AI:** Navy `#0A1F44` · Gold `#D4AF37` · Fondo `#FAFAF7`.

---

## FLUJO TÍPICO DE SESIÓN

1. Ivan abre PowerShell → `cd servidor` → `node servidor.js`
2. Abre `http://localhost:3737/dashboard.html` en Chrome
3. Selecciona cliente en el header
4. Va al Tab Estrategia → completa/verifica `objetivo_macro`
5. Va al Tab Marketing → el prompt de parrilla ya carga la identidad automáticamente
6. Copia el prompt generado → lo pega en Claude (esta sesión)
7. Claude genera el JSON de parrilla respetando schema v4.0 y reglas R1-R10
8. Ivan va a Tab Producción → sube el JSON → el servidor genera el Excel
9. Ivan descarga el Excel y lo sube a Drive del cliente

---

## CONTEXTO DE NEGOCIO

- Ivan entrega outputs a clientes por **Drive o email** — los clientes nunca acceden al dashboard
- Score mínimo de entrega: **9.0/10**
- Colombia = UTC-5 — usar hora colombiana en fechas y logs
- El sistema es 100% local. Sin deploy. Sin acceso externo.
- Operador único: Ivan es founder + CTO + quien ejecuta todo el marketing de todos los clientes

---

*Después de leer este archivo, leer `AVANCES.md` (detalle de lo construido por sesión), `PENDIENTES.md` (tareas vivas), `CLAUDE.md` (schemas y anti-patrones) y `MANUAL_CONEXION_REDES.md` (conexión de Instagram/Facebook/TikTok).*
