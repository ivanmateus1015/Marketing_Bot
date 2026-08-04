# CONTEXTO PARA NUEVA SESIÓN — TimeKeepers AI Dashboard
> Actualizado: 2026-08-03 (sesión 8) | Leer este archivo COMPLETO antes de cualquier acción. Es la puerta de entrada al proyecto.

> **Mapa de documentación:**
> - **Este archivo** — qué es el proyecto, cómo arrancar y en qué estado está.
> - **`INFORME_CONEXION.md`** — auditoría de conexión de las 12 pestañas y cómo revalidarla. *(nuevo, sesión 8)*
> - **`PENDIENTES.md`** — lista viva de tareas (se tachan al completarse).
> - **`AVANCES.md`** — todo lo que ya se construyó, sesión por sesión.
> - **`CLAUDE.md`** — reglas de calidad, schemas y anti-patrones. Leer antes de generar output de cliente.
> - **`MANUAL_CONEXION_REDES.md`** — cómo obtener los tokens de Instagram / Facebook / TikTok.

---

## ¿QUÉ ES ESTO?

**TimeKeepers AI** es una agencia de marketing digital operada en solitario por **Ivan** (Bogotá, Colombia). Ivan actúa simultáneamente como founder, CTO y operador único.

Este repositorio es el **dashboard de operación interna** de la agencia. Los clientes **nunca** ven este sistema. Ivan lo usa para producir todos los outputs (parrillas de contenido, stories, ads, reportes) y luego los entrega a los clientes por Google Drive o email.

El sistema NO es una app pública. Es una herramienta local de productividad para un solo operador.

---

## DÓNDE ESTÁ TODO

**Ruta actual (macOS):**
```
/Users/ivanmateus1015/Documents/Ivan/Claude/Bot maestro/Marketing_Bot/
```
> El repo nació en una máquina Windows (`c:\...\BOT MAESTRO MARKETING\timekeepers-workspace\`). Si encuentras rutas de Windows en la documentación vieja, son de esa época.

| Archivo / Carpeta | Qué es | Tamaño actual |
|---|---|---|
| `dashboard.html` | Frontend completo — vanilla JS, sin frameworks | ~7.680 líneas |
| `servidor/servidor.js` | Backend Node.js/Express — todos los endpoints | ~2.960 líneas (**59 endpoints**) |
| `CLAUDE.md` | Cerebro operativo — reglas, schemas, anti-patrones | — |
| `INFORME_CONEXION.md` | Auditoría de conexión + estado de las pruebas | — |
| `scripts/probar-pestanas.sh` | **Prueba las 12 pestañas de cualquier cliente** | — |
| `clientes/{slug}/` | Una carpeta por cliente con toda su info | — |
| `clientes/{slug}/00-identity/identity.json` | Identidad del cliente, por **código de schema** (`A`, `B`, `W`…) | — |
| `clientes/{slug}/_historial.md` | Registro cronológico de producción | — |
| `clientes/{slug}/objetivos.json` | Objetivos mensuales | — |
| `clientes/{slug}/estados.json` | Estados de producción (Kanban) | — |
| `clientes/{slug}/leads.json` | CRM de leads | — |
| `clientes/{slug}/redes.json` | Cuentas y snapshots de redes — **en `.gitignore`, tiene tokens** | — |
| `.claude/skills/` | 41 skills de marketing instaladas | — |
| `data/data.json` · `data/data.js` | Cache del dashboard (auto-generado) | auto |

---

## CÓMO INICIAR EL SERVIDOR

```bash
cd "servidor" && node servidor.js
```

**URL:** `http://localhost:3737/dashboard.html` · **Puerto:** 3737

> ⚠️ La documentación vieja decía "solo desde PowerShell de Windows, nunca bash/WSL" porque el módulo SEO fallaba por DNS. **En este Mac arranca con bash sin problema, módulo SEO incluido** — verificado el 2026-07-29.

**Servicios opcionales que corren en esta máquina:** Postgres (`timekeepers`, puerto 5432) y Meilisearch (7700). Sus endpoints responden, pero **ninguna pestaña los consume todavía** — son una capa paralela a los archivos JSON.

### Verificar que todo sigue conectado
```bash
bash scripts/probar-pestanas.sh                    # cliente ficticio de prueba
bash scripts/probar-pestanas.sh urbex-architecture # cualquier otro
```
Marca `✓` lo que responde, `✗` lo que falla y `–` lo que se omite porque ese cliente no tiene ese dato.

---

## CLIENTES

| Slug | Nombre real | Plan | Mercado | Score identity |
|------|-------------|------|---------|----------------|
| `urbex-architecture` | Urbex Architecture & Design SAS | Deluxe | Bogotá | 8.2 |
| `draken-vip` | Draken VIP Limousine | Deluxe | Miami (EN/ES) | 9.8 |
| `lunamarte` | Lunamarte Studio LLC | Por definir | Naples, FL | 8.4 |
| `maria-fernanda` | Maria Fernanda | Estándar | Colombia | 0 — identity vacío |
| `timekeepers-ai` | TimeKeepers AI | Casa (interno) | Bogotá | **sin `identity.json`** |
| `aurora-bakehouse` | **FICTICIO — cliente de prueba** | Deluxe | Bogotá | 10 |

**Cliente canario (features nuevas):** `urbex-architecture` — web: https://www.urbexad.com/ (Wix, tiene `robots: noindex`, corregir).

### `aurora-bakehouse` — empresa ficticia de prueba *(sesión 8)*
Panadería artesanal **inventada** para validar el dashboard end-to-end. Tiene datos completos en las 12 pestañas: identity 10/10, parrilla que valida 10/10, 18 piezas en los 5 estados del pipeline, 9 leads con pipeline de $14,2M, 11 snapshots de redes, archivos en las 4 carpetas.

Los números están **cruzados a propósito**: el crecimiento de Instagram (+517) es el mismo dato que el resultado real de seguidores en Tab Estrategia, y los 9 leads del CRM son los que aparecen en Resumen y en el Reporte mensual. Si algo se desconecta, se nota de inmediato.

Borrarla cuando ya no se necesite:
```bash
rm -rf clientes/aurora-bakehouse && curl -X POST http://localhost:3737/api/regenerar
```

**Planes comerciales:** Estándar $900 USD/mes · Deluxe $1.500 USD/mes. En la práctica todos los clientes acceden a los 41 skills (decisión de arquitectura).

---

## STACK TÉCNICO

**Servidor:** Node.js / Express, cors, body-parser, multer · `xlsx` (parsear Excel entrante y generar Excel Master) · `exceljs` (generar parrillas y stories con estilos) · `chokidar` (file watcher que regenera `data.js`) · `pg` + `meilisearch` (capa paralela sin consumir).

**Frontend:** Vanilla JS puro. Sin frameworks. Sin bundlers. Una sola página: `dashboard.html`.

**Agencia (fuera de este repo):** n8n 2.10.4 self-hosted · Perplexity · Gemini 2.5 Pro · Google Sheets.

---

## ESTADO REAL — LAS 12 PESTAÑAS

Validado el 2026-08-03 en 5 capas: endpoints (30/30), frontend→backend (12/12 hacen fetch), botones (75 funciones, 0 rotas), rutas (28 pedidas, 0 huérfanas) y escritura bidireccional (round-trip confirmado).

| # | Pestaña | Qué hace | Fuente de datos |
|---|---------|----------|-----------------|
| 1 | 🆔 Cliente | Identity por bloques, score 0-10 | `identity.json` |
| 2 | 🎯 Estrategia | Objetivo macro, 6 KPIs con semáforo, mix, semanas | `objetivos.json` |
| 3 | 📣 Contenido | Generadores de prompts (parrilla, stories, ads, captación, ventas, medición) | 41 skills + identity |
| 4 | 📁 Producción | Kanban de 5 etapas + explorador de archivos + validador | `estados.json` + archivos |
| 5 | 📅 Calendario | Mes visual con piezas y stories por día | `estados.json` |
| 6 | 👥 Leads | CRM de 6 estados con pipeline en pesos | `leads.json` |
| 7 | 📊 Resumen | **Consolida las otras 11** | `/api/cliente/:slug/resumen` |
| 8 | 📈 Historial | Bitácora + ángulos usados | `_historial.md` |
| 9 | 🔍 SEO | Auditoría real de la web, 14 checks, plan priorizado | `/api/seo-audit` |
| 10 | 📲 Redes | Config IG/FB/TikTok + snapshots diarios | `redes.json` |
| 11 | 🔎 Seguimiento | Crecimiento y engagement por red + análisis con Claude | `redes.json` |
| 12 | 🧩 Herramientas | Ideas · Research · Reporte mensual · AI CEO · CRO · Excel Master | varias |

**Pipeline de producción (5 etapas):** Guion → Producción → Aprobación cliente → Programado → Publicado. Nada se publica sin aprobación.

---

## QUÉ SE HIZO EN LA SESIÓN 8 (2026-07-29 / 08-03)

Auditoría de conexión completa. Detalle en **`INFORME_CONEXION.md`**.

### Bugs corregidos — pestañas que mostraban información falsa
1. **Tab Producción nunca mostró stories ni reels** — el scan de `/api/cliente/:slug/archivos` usaba `return` en vez de `continue` y abortaba tras la primera subcarpeta. Urbex reportaba 3 archivos teniendo 5.
2. **Excel Master, hoja Identity casi vacía** — leía `identity.nombre`, `identity.tagline`… pero `identity.json` guarda por código de schema (`A`, `B`, `W`). Ninguna de esas claves existe.
3. **Excel Master, hoja Historial siempre en 0** — regex de un formato que ningún `_historial.md` usa. Ahora reusa `leerHistorial()`.
4. **Reporte Mensual siempre decía 0 piezas** — leía `rHist.historial`; la clave real es `bitacora`. Además buscaba `p.angulo` (singular) cuando la bitácora guarda `angulos`.
5. **Leads creados por API caían fuera de los filtros del CRM** — defaults `Nuevo`/`Instagram DM` contra `Nuevo Lead`/`Instagram` del dashboard.

### Pestañas conectadas al servidor
6. **Tab Resumen** era un pantallazo estático de `data.js`. Nuevo endpoint `GET /api/cliente/:slug/resumen` que consolida identity + objetivos + estados + leads + redes + historial + archivos.
7. **Redes y Seguimiento vivían solo en `localStorage`** — se perdían al limpiar el navegador. Ahora persisten en `clientes/{slug}/redes.json`. **El token nunca vuelve al navegador**: el servidor devuelve `token: ""` + `tiene_token: true`, y guardar con el campo vacío conserva el existente.
8. **Proxy de TikTok** *(era el pendiente #1)* — `GET /api/redes/:plataforma/:slug/probar` cubre `ig`, `fb` y `tt` con el mismo contrato.
9. **Botón ➕ Nuevo cliente** — `/api/cliente/nuevo` existía pero ninguna pantalla lo llamaba. Ahora además crea `identity.json` semilla y los scaffolds de `objetivos`, `estados`, `leads` y `redes`, para que un cliente nuevo abra las 12 pestañas sin error.

### Endpoints nuevos
```
GET    /api/cliente/:slug/resumen                    → consolidado de las 12 pestañas
GET    /api/cliente/:slug/redes                      → config (token enmascarado) + snapshots + stats
PUT    /api/cliente/:slug/redes/:plataforma          → guardar ig | fb | tt
POST   /api/cliente/:slug/redes/snapshot             → un registro por fecha+red
DELETE /api/cliente/:slug/redes/snapshot?fecha=&red= → borrar snapshot
GET    /api/redes/:plataforma/:slug/probar           → proxy de prueba (evita CORS)
```

---

## LO QUE ESTÁ PENDIENTE

> Lista completa y viva en **`PENDIENTES.md`**. Lo más urgente:

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | **Repo público con datos de clientes reales** — ver abajo | 🔴 revisar |
| 2 | **Cifrar los tokens en disco (AES)** — ya no viajan al navegador ni entran al repo, pero en `redes.json` siguen en texto plano | ALTA |
| 3 | **PASO 5** — Links de aprobación para clientes (token 7 días) | ALTA |
| 4 | **PASO 13** — Panel de Integraciones (Search Console + Meta Ads) | ALTA |
| 5 | **`timekeepers-ai` sin `identity.json`** — única prueba que falla en todo el sistema | Media |
| 6 | **Gráfica de evolución en Tab Redes** — los datos ya están en el servidor, falta dibujarlos | Media |
| 7 | **Feedback loop** performance real → ajuste de contenido (requiere PASO 13) | Media |
| 8 | **PASO 6** — Reporte de cierre mensual exportable a PDF (el reporte ya funciona; falta el PDF) | Media |

### 🔴 Revisar antes de volver a hacer push
El remoto `origin` (`github.com/ivanmateus1015/Marketing_Bot`) es **público**, y el historial ya contiene los `identity.json` de los clientes reales y un `leads.json`. Esos archivos llevan información comercial y de contacto. Decisiones a tomar:
- Volver el repo **privado** (lo más rápido), o
- Sacar `clientes/` del repo con `.gitignore` y reescribir el historial.

Los tokens de redes **no** están expuestos: `clientes/*/redes.json` entró a `.gitignore` en la sesión 8 y nunca estuvo tracked.

### Bugs / validaciones pendientes
| Estado | Descripción |
|--------|-------------|
| ⚠️ VALIDAR | Módulo SEO Web con sitios no-Wix (WordPress, Squarespace) |
| ⚠️ FALTA | `objetivos.json` en `draken-vip`, `lunamarte` y `maria-fernanda` — Tab Estrategia vacío |
| 🔴 URGENTE | urbexad.com con `robots: noindex` — Google no indexa la web del cliente. Corregir en Wix |

---

## SCHEMA PARRILLA v5 (resumen ejecutivo)

```json
{
  "hora": "7:00 PM (Reel entre semana) · 12:00 PM (Carrusel) · 11:00 AM (sábado)",
  "plataforma": "Reel: IG Reels + TikTok + FB Reels · Carrusel: IG Feed + FB",
  "objetivo": "UNO solo: Awareness | Engagement | Trust | Lead Gen | Conversión",
  "caption_post": "≤60 palabras Reel · ≤50 Carrusel · ≤80 Foto — texto del POST",
  "copy_slides": "string: 'N slides — razón. S1[Gancho]...' (solo Carrusel; 'N/A' en Reel)",
  "keyword_dm": "una de MÁXIMO 2 keywords por parrilla (null en Awareness/Engagement/Trust)",
  "material": "proyecto + momento + prueba del claim. Flags ⚠ cuando aplique",
  "estado": "Guion → Producción → Aprobación cliente → Programado → Publicado"
}
```

**Reglas duras v5:**
1. Máximo **2 keywords DM** por parrilla — piezas del mismo eje comparten keyword.
2. **Objetivo único** por pieza (nunca dual) — evaluación binaria al cierre.
3. **Hashtags: exactamente 5** (1 marca + 4 ultra-nicho). Sin `#Bogota`/`#Colombia` puros.
4. **Urgencia solo verificable** — prohibido "orden de llegada" y cupos inventados.
5. **Flags ⚠** en material: archivo real / validar con cliente + plan B / consentimiento.
6. Semanas **lunes a domingo** (batching de producción).
7. `caption_post` = community manager · `copy_slides` = diseñador. NUNCA mezclarlos.

> El validador vive en `validarParrilla()` (servidor.js) y aplica R1–R10. Se ejecuta desde Tab Producción → botón **🔍 Validar**. La parrilla de Aurora pasa 10/10 sin errores ni warnings — sirve de referencia de qué acepta.

---

## DECISIONES DE ARQUITECTURA (no cambiar sin razón)

1. `caption_post` + `copy_slides` reemplazan a `caption`. Backward compat: `p.caption_post || p.caption || ''`
2. `exceljs` para generar parrillas y stories con estilos. `xlsx` para parsear Excel entrante y para el Excel Master.
3. Todos los clientes tienen acceso a los 41 skills (no se discrimina por plan en el código).
4. Rutas siempre: `clientes/{slug}/` (no `clients/{clientId}/`).
5. Captura de HTML para SEO: 300KB mínimo (Wix pone meta tags a 100KB+).
6. `objetivos.json`, `estados.json`, `leads.json` y `redes.json` viven en la raíz de `clientes/{slug}/`.
7. `identity.json` se indexa por **código de schema** (`A`, `B`, `C`… `AH`) más `website_url` como campo extra. Si un endpoint necesita el nombre, es `identity['A']`, no `identity.nombre`.
8. Skills precargadas: Tab Contenido carga "Parrilla Feed" automáticamente si no hay paquete activo.
9. El generador usa solo `objetivo_macro` del mes (el detalle semanal es para seguimiento, no para generar).
10. Los tokens de redes **nunca** se devuelven al frontend. El servidor hace de proxy.

---

## REFERENCIAS RÁPIDAS DE CÓDIGO

### Agregar un tab nuevo al dashboard
1. Botón en `<nav class="client-tabs">`
2. `<div class="tab-panel" id="tab-{nombre}">` tras los otros panels
3. Agregar el nombre al array `tabs` en **`setTab()` y en `_renderTabBadges()`** (son dos arrays paralelos — si se desincronizan, los badges se pintan en el tab equivocado)
4. `case '{nombre}': render{Nombre}(); break;` en `renderCurrentTab()`
5. Crear `render{Nombre}()` en el JS

### Agregar un endpoint al servidor
Insertar antes del bloque `// ── File watcher ──` al final de `servidor.js`.

### Estructura mínima de `objetivos.json`
```json
{
  "mes_activo": "2026-07",
  "meses": {
    "2026-07": {
      "mes": "2026-07",
      "north_star_metric": "leads",
      "objetivo_macro": "Texto del objetivo general del mes",
      "objetivos": { "seguidores": 600, "leads": 25 },
      "resultados_reales": { "seguidores": 517, "leads": 27 },
      "mix_contenido": { "Awareness": 45, "Conversion": 35, "Educacion": 20 },
      "semanas": [{ "numero": 1, "fechas": "", "foco": "", "kpis": "", "cta_semana": "", "exito_si": "", "resultados_reales": {} }],
      "notas": ""
    }
  }
}
```

---

## REGLAS DE COMPORTAMIENTO PARA CLAUDE

1. **Antes de cualquier output para un cliente:** leer `identity.json` → leer `_historial.md` → revisar outputs previos. Sin cumplir estos 3 pasos, no generar nada.
2. **Score mínimo aceptable:** 9.0/10. Si el output no llega, avisar antes de entregar. No silenciar.
3. **Idioma:** siempre español, salvo que el contexto del cliente sea explícitamente inglés (Draken VIP y Lunamarte pueden requerir inglés para mercado USA).
4. **n8n:** nunca usar `new Set()` (incompatible con v2.10.4). Expresiones: `{{ $json["Campo"] }}` sin escapes.
5. **No crear archivos fuera de la estructura definida** sin confirmación de Ivan.
6. **Paleta de marca TimeKeepers AI:** Navy `#0A1F44` · Gold `#D4AF37` · Fondo `#FAFAF7`.
7. **Tras tocar el código, correr `bash scripts/probar-pestanas.sh`** antes de dar algo por terminado.

---

## FLUJO TÍPICO DE SESIÓN

1. Terminal → `cd servidor && node servidor.js`
2. Abrir `http://localhost:3737/dashboard.html`
3. Seleccionar cliente en el header
4. Tab Estrategia → completar/verificar `objetivo_macro`
5. Tab Contenido → el prompt de parrilla carga la identidad automáticamente
6. Copiar el prompt generado → pegarlo en Claude
7. Claude genera el JSON respetando schema v5 y reglas R1–R10
8. Tab Producción → subir el JSON → botón **🔍 Validar** → generar el Excel
9. Descargar el Excel y subirlo al Drive del cliente

---

## CONTEXTO DE NEGOCIO

- Ivan entrega outputs a clientes por **Drive o email** — los clientes nunca acceden al dashboard
- Score mínimo de entrega: **9.0/10**
- Colombia = UTC-5 — usar hora colombiana en fechas y logs
- El sistema es 100% local. Sin deploy. Sin acceso externo.
- Operador único: Ivan es founder + CTO + quien ejecuta todo el marketing de todos los clientes

---

*Después de leer este archivo: `INFORME_CONEXION.md` (estado de conexión), `PENDIENTES.md` (tareas vivas), `CLAUDE.md` (schemas y reglas de calidad) y `MANUAL_CONEXION_REDES.md` (tokens de redes).*
