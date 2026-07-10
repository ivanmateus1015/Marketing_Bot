# SISTEMA.md — TimeKeepers AI · Archivo Maestro de Sesión

> **Leer este archivo primero en cada sesión.** Contiene todo lo necesario para arrancar sin contexto previo.
> Última actualización: 2026-06-16

---

## QUÉ ES ESTE SISTEMA

**TimeKeepers AI** es una agencia de marketing digital operada en solitario por **Ivan** (Bogotá, Colombia, UTC-5). Ivan actúa como founder, CTO y ejecutor único. Este repositorio es el **dashboard de operación interna**: Ivan lo usa para producir contenido (parrillas, stories, ads, reportes) y lo entrega a sus clientes por Google Drive o email. Los clientes **nunca** acceden a este sistema.

El sistema es 100% local. No hay deploy. No hay acceso externo.

---

## MAPA DE ARCHIVOS — QUÉ LEER Y CUÁNDO

| Archivo | Cuándo leerlo |
|---------|--------------|
| **`SISTEMA.md`** (este) | Primera lectura de cada sesión |
| **`CLAUDE.md`** | Antes de generar cualquier output — contiene reglas, schemas JSON completos, anti-patrones y QA |
| **`CONTEXTO_PARA_NUEVA_SESION.md`** | Para detalles técnicos: referencias de código, estructura de `objetivos.json`, decisiones de arquitectura |
| **`AVANCES.md`** | Para entender qué se construyó sesión a sesión |
| **`PENDIENTES.md`** | Para saber qué tareas están vivas y su prioridad |
| **`MANUAL_CONEXION_REDES.md`** | Solo si el trabajo involucra Instagram, Facebook o TikTok |
| `clientes/{slug}/00-identity/identity.md` | SIEMPRE antes de generar contenido para ese cliente |
| `clientes/{slug}/_historial.md` | SIEMPRE después de leer el identity — para no repetir ángulos |

---

## CLIENTES ACTIVOS

| Slug | Nombre | Plan | Mercado | Tono | Idioma |
|------|--------|------|---------|------|--------|
| `urbex-architecture` | Urbex Architecture & Design SAS | Deluxe | Bogotá | Sofisticado, técnico, visual | Español Colombia |
| `draken-vip` | Draken VIP Limousine | Deluxe | Miami / NYC | Ejecutivo, preciso, bilingüe | Inglés (primario) / Español |
| `maria-fernanda` | Maria Fernanda | Estándar | Colombia | Cercano, aspiracional | Español Colombia |
| `timekeepers-ai` | TimeKeepers AI (casa) | Interno | Bogotá | — | Español |

**Cliente canario (prueba de features nuevas):** `urbex-architecture`

**Planes comerciales:**
- Plan Estándar: $900 USD/mes — 10 skills core
- Plan Deluxe: $1,500 USD/mes — 41 skills completas
- En la práctica todos los clientes acceden a las 41 skills (decisión de arquitectura tomada)

---

## STACK TÉCNICO

**Servidor (local, puerto 3737):**
- Node.js / Express · cors · body-parser · multer
- `xlsx` v0.18.5 — solo para parsear Excel entrante
- `exceljs` — solo para generar Excel con estilos (parrillas, stories)
- `chokidar` — file watcher que auto-regenera `data.json` y recarga el dashboard

**Frontend:** Vanilla JS puro. Sin frameworks. Sin bundlers. Un solo archivo: `dashboard.html`.

**Herramientas de agencia (fuera del repo):**
- n8n 2.10.4 self-hosted
- Perplexity sonar / sonar-pro
- Gemini 2.5 Pro
- Google Sheets

---

## CÓMO INICIAR EL SERVIDOR

```powershell
# SIEMPRE desde PowerShell de Windows — NUNCA desde bash/WSL
cd "c:\Users\IvanEstebanMateusSoc\Documents\Ivan\Claude\BOT MAESTRO MARKETING\timekeepers-workspace\servidor"
node servidor.js
```

**URL del dashboard:** `http://localhost:3737/dashboard.html`

> bash/WSL no resuelve bien el DNS de Wix/CDN — el módulo SEO falla.

---

## ESTRUCTURA DEL DASHBOARD (12 tabs por cliente)

| Tab | Contenido |
|-----|-----------|
| **Cliente** | Identity score, datos del cliente |
| **Estrategia** | Objetivo macro del mes, tabla semanal, 6 KPIs, mix de contenido |
| **Contenido** | Generadores de prompts: Parrilla, Stories, Amplificación, Paid Ads, Captación, Ventas, Medición |
| **Producción** | Kanban (Guion → Producción → Aprobación cliente → Programado → Publicado), explorador de archivos |
| **Calendario** | Vista temporal de piezas |
| **Leads** | Gestión de leads |
| **Resumen** | Métricas generales |
| **Historial** | Registro de producción |
| **SEO** | Auditoría HTML real del sitio (checklist 14 puntos, score 0-100) |
| **Redes** | Conexión IG / FB / TikTok (tokens, prueba en vivo, seguimiento diario) |
| **Seguimiento** | Análisis de cuentas con Claude — diagnóstico vs benchmark |
| **Herramientas** | Ideas · Customer Research · CRO Web · AI CEO · Excel Master · Reporte |

---

## FLUJO TÍPICO DE SESIÓN

1. Ivan abre PowerShell → `node servidor.js`
2. Abre `http://localhost:3737/dashboard.html` en Chrome
3. Selecciona el cliente en el header
4. Va a **Tab Estrategia** → completa/verifica `objetivo_macro`
5. Va a **Tab Contenido** → el generador de parrilla carga la identidad automáticamente
6. Copia el prompt → lo pega en Claude Code
7. Claude genera el JSON de parrilla (schema v5, reglas R1–R10)
8. Ivan va a **Tab Producción** → sube el JSON → el servidor genera el Excel automáticamente
9. Ivan descarga el Excel → lo sube a Drive del cliente

---

## REGLAS DE COMPORTAMIENTO DE CLAUDE (resumen ejecutivo)

### Flujo OBLIGATORIO antes de generar contenido para cualquier cliente
1. Leer `clientes/{slug}/00-identity/identity.md`
2. Leer `clientes/{slug}/_historial.md`
3. Revisar outputs previos en la subcarpeta correspondiente

**Sin estos 3 pasos: no generar nada.**

### Flujo OBLIGATORIO después de generar contenido
Actualizar `clientes/{slug}/_historial.md` con: fecha ISO · tipo de pieza · nombre del archivo · skills usadas · ángulos · score.

### Reglas críticas
- **Score mínimo:** 9.0/10 — si el output no llega, avisar a Ivan antes de entregar. No silenciar.
- **Idioma:** siempre español, salvo contexto explícitamente inglés (Draken VIP para mercado USA).
- **n8n:** nunca usar `new Set()` (incompatible con v2.10.4). Expresiones: `{{ $json["Campo"] }}` sin escapes.
- **Archivos:** no crear fuera de la estructura definida sin confirmación de Ivan.
- **`caption_post`** = texto que se publica en Instagram (community manager). **`copy_slides`** = brief para el diseñador (solo carruseles). NUNCA mezclarlos.

### Paleta de marca TimeKeepers AI
Navy `#0A1F44` · Gold `#D4AF37` · Fondo `#FAFAF7`

---

## SKILLS DISPONIBLES (41 en total)

**Plan Estándar — 10 skills core:**
`copywriting` · `social-content` · `email-sequence` · `copy-editing` · `marketing-psychology` · `customer-research` · `content-strategy` · `image` · `marketing-ideas` · `popup-cro`

**Plan Deluxe — skills adicionales (31 más):**
`paid-ads` · `ad-creative` · `ab-test-setup` · `analytics-tracking` · `page-cro` · `signup-flow-cro` · `onboarding-cro` · `form-cro` · `paywall-upgrade-cro` · `churn-prevention` · `seo-audit` · `ai-seo` · `programmatic-seo` · `schema-markup` · `site-architecture` · `competitor-alternatives` · `competitor-profiling` · `sales-enablement` · `revops` · `cold-email` · `lead-magnets` · `free-tool-strategy` · `referral-program` · `community-marketing` · `launch-strategy` · `pricing-strategy` · `video` · `directory-submissions` · `aso-audit` · `co-marketing` · `product-marketing-context`

---

## ESTADO ACTUAL DEL SISTEMA (última sesión: 7 — 2026-06-10)

### Funcionando al 100%
- Dashboard base con 12 tabs por cliente
- Generador de Parrilla v5.0 (schema + validador QA + Excel con estilos)
- Generador de Stories (5 slides mínimo, reglas RS1–RS9-B)
- Excel exportado con `exceljs`: header vino tinto `#722F37`, freeze pane, wrap text
- Tab SEO Web (captura 300KB, checklist 14 puntos)
- Tab Producción / Kanban 4 columnas (pipeline de 5 etapas)
- Tab Herramientas (6 módulos)
- Tab Redes Sociales (IG/FB con conexión en vivo, TikTok manual)
- Tab Seguimiento (análisis con Claude)
- 44 endpoints en servidor.js
- Validador QA sincronizado con schema v5 (parrilla de Urbex: 10/10)

### Pendiente ALTA prioridad
1. **Proxy TikTok** en el servidor (habilita "Probar conexión")
2. **Almacenamiento seguro de tokens** de redes (cifrado AES en servidor, fuera de localStorage)
3. **PASO 5** — Links de aprobación para clientes (token 7 días)
4. **PASO 13** — Panel de Integraciones (Search Console + Meta Ads)

### Urgente (tarea de Ivan, no de código)
- **urbexad.com sigue con `robots: noindex`** — Google no indexa la web. Corregir en panel de Wix.
- Identities incompletos: `maria-fernanda` y `timekeepers-ai` esperan info de clientes.

---

## ESTRUCTURA DE CARPETAS (referencia rápida)

```
Marketing_Bot/
├── SISTEMA.md               ← ESTE ARCHIVO — leer primero en cada sesión
├── CLAUDE.md                ← Cerebro operativo — reglas, schemas, anti-patrones
├── CONTEXTO_PARA_NUEVA_SESION.md  ← Detalles técnicos y referencias de código
├── AVANCES.md               ← Historial de lo construido sesión a sesión
├── PENDIENTES.md            ← Tareas vivas con prioridad
├── MANUAL_CONEXION_REDES.md ← Guía de tokens IG / FB / TikTok
├── README.md                ← Instrucciones generales del workspace
├── dashboard.html           ← Frontend completo (~6.540 líneas, vanilla JS)
├── servidor/
│   ├── servidor.js          ← Backend Express, 44 endpoints (~2.000 líneas)
│   └── package.json
├── clientes/
│   ├── _plantilla/          ← Plantilla base para nuevos clientes
│   ├── draken-vip/
│   ├── urbex-architecture/  ← Cliente canario (prueba de features)
│   ├── maria-fernanda/
│   └── timekeepers-ai/
│       ├── 00-identity/identity.md   ← LEER SIEMPRE PRIMERO
│       ├── 01-contenido/parrillas/
│       ├── 01-contenido/stories/
│       ├── 01-contenido/reels/
│       ├── 02-paid-ads/meta-ads/
│       ├── 02-paid-ads/google-ads/
│       ├── 03-email/
│       ├── 04-landing-pages/
│       └── _historial.md             ← LEER SIEMPRE SEGUNDO
├── .claude/skills/          ← 41 skills de marketing
├── plantillas/              ← identity-template.md y onboarding cliente
├── scripts/
│   └── actualizar-dashboard.js  ← Regenera data.json manualmente
├── data/
│   └── data.json            ← Cache del dashboard (auto-generado)
├── n8n-workflows/           ← Exportaciones de workflows n8n
└── outputs-generados/       ← Outputs finales listos para entregar
```

---

## COMANDOS RÁPIDOS PARA CLAUDE (los más usados)

```
"Hazme la parrilla de [mes] para [cliente]"
→ 12–16 posts con diversidad de ángulos, schema v5, reglas R1–R10

"Genera cadena de stories para [cliente] sobre [tema]"
→ Primero pregunta 6 campos (objetivo, tipo, slides, interactivo, CTA, material)
→ Output JSON en clientes/{slug}/01-contenido/stories/

"Crea campaña Meta Ads para [cliente] con presupuesto [X]"
→ Objetivo, audiencias, creativos (copy + visual brief), copy por anuncio

"Audita el Identity de [cliente] y dime qué falta"
→ Revisa identity.md campo por campo — marca [POR DEFINIR] y los gaps

"Genera email de bienvenida para [cliente]"
→ Onboarding con tono del cliente, estructura AIDA o PAS, CTA principal

"Crea 3 variantes A/B de headline para [cliente]"
→ 3 headlines con ángulos distintos y justificación psicológica

"Dame 10 ideas de contenido para [cliente] para [mes]"
→ Ideas con ángulo, formato sugerido y hook de apertura

"Analiza competidores de [cliente] y dame ángulos diferenciadores"
→ Requiere skills competitor-profiling + competitor-alternatives (Plan Deluxe)
```

---

## SCHEMA PARRILLA v5 — REGLAS DURAS (resumen)

1. **Máximo 2 keywords DM** por parrilla completa
2. **Objetivo único** por pieza (nunca dual — no "Conversión / Awareness")
3. **Exactamente 5 hashtags**: 1 marca + 4 ultra-nicho. Sin #Bogota/#Colombia puros
4. **Urgencia solo verificable** — prohibido "orden de llegada" y cupos inventados
5. **`caption_post`** = texto del post (community manager) · **`copy_slides`** = brief diseñador
6. **Score mínimo 9.0/10** — si no llega, avisar antes de entregar
7. **Semanas lunes a domingo** (batching de producción)
8. **Estados del pipeline**: 1️⃣ Guion → 2️⃣ Producción → 3️⃣ Aprobación cliente → 4️⃣ Programado → 5️⃣ Publicado

El schema completo con todos los campos y reglas R1–R10 está en **`CLAUDE.md` secciones 5, 8 y 9**.

---

*TimeKeepers AI — Sistema interno. No compartir con clientes.*
