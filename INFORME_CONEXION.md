# INFORME — Auditoría de conexión y pruebas end-to-end

> Fecha: **2026-07-29** · Alcance: las 12 pestañas del dashboard + los 60 endpoints del servidor.
> Estado final: **30/30 pruebas OK** con el cliente de prueba. Script reejecutable: `scripts/probar-pestanas.sh`.

---

## 1. Cómo verificar todo tú mismo

```bash
# 1. Arrancar el servidor (en macOS basta bash; no hace falta PowerShell)
cd servidor && node servidor.js

# 2. En otra terminal, probar las 12 pestañas
bash scripts/probar-pestanas.sh                    # cliente de prueba
bash scripts/probar-pestanas.sh urbex-architecture # cualquier otro cliente

# 3. Abrir el dashboard
open http://localhost:3737/dashboard.html
```

El script autodescubre el mes activo y los archivos de cada cliente, así que sirve para todos.
Marca `✓` lo que responde, `✗` lo que falla y `–` lo que se omite porque ese cliente no tiene ese dato.

Resultado por cliente al cierre de esta sesión:

| Cliente | Pruebas OK | Fallidas | Nota |
|---|---|---|---|
| `aurora-bakehouse` | 30 | 0 | Cliente ficticio de prueba, completo |
| `urbex-architecture` | 30 | 0 | — |
| `draken-vip` | 25 | 0 | Sin `objetivos.json` ni stories |
| `lunamarte` | 25 | 0 | Sin `objetivos.json` ni stories |
| `maria-fernanda` | 22 | 0 | Identity vacío, sin objetivos ni outputs |
| `timekeepers-ai` | 21 | 1 | **Sin `identity.json`** — dato faltante, no bug |

---

## 2. Desconexiones encontradas y corregidas

### 🔴 Bugs — pestañas que mostraban información incorrecta

**1. Tab Producción nunca mostraba las stories ni los reels.**
`GET /api/cliente/:slug/archivos` recorría las carpetas con `return` en vez de `continue`, así que
al entrar en la primera subcarpeta abortaba el resto. `01-contenido/` solo listaba `parrillas/`;
`stories/` y `reels/` eran invisibles. Urbex reportaba 3 archivos cuando tenía 5.
→ `servidor.js` — scan recursivo corregido.

**2. Excel Master: la hoja Identity salía prácticamente vacía.**
`generarExcelMaster()` leía `identity.nombre`, `identity.tagline`, `identity.industria`… pero
`identity.json` guarda todo por **código de schema** (`A`, `B`, `C`, `W`, `J`…). Ninguna de esas
claves existe. La hoja solo mostraba el website y el Resumen Ejecutivo decía "Industria: —".
→ Ahora recorre el schema y vuelca los 47 campos con bloque, nombre humano y código.

**3. Excel Master: la hoja Historial salía siempre en 0.**
Usaba un regex para un formato (`- **fecha** | … | score:…`) que ningún `_historial.md` tiene —
todos usan tabla markdown. → Ahora reusa `leerHistorial()`, el mismo parser del Tab Historial.

**4. Reporte Mensual reportaba siempre 0 piezas.**
Leía `rHist.historial`, clave que el endpoint nunca devuelve (se llama `bitacora`). Además
buscaba `p.angulo` en singular cuando la bitácora guarda `angulos` como texto separado por comas,
así que el "ángulo más usado" jamás aparecía.
→ Corregido, y ahora la producción real sale de `estados.json` vía `/resumen`, no de la bitácora.

**5. Leads creados por API quedaban fuera de los filtros del CRM.**
El servidor ponía por defecto `estado: "Nuevo"` y `canal: "Instagram DM"`, pero el dashboard
filtra por `"Nuevo Lead"` e `"Instagram"`. → Defaults alineados.

### 🟠 Pestañas que no estaban conectadas al servidor

**6. Tab Resumen era un pantallazo estático.**
Leía solo `data/data.js` (snapshot en disco). No sabía nada de producción, objetivos, leads ni
redes, y pedía un `c.tagline` que ese snapshot nunca ha tenido.
→ Nuevo endpoint `GET /api/cliente/:slug/resumen` que consolida identity + objetivos + estados +
leads + redes + historial + archivos. El tab ahora muestra KPIs con % de cumplimiento, el tablero
de producción por estado, el pipeline de leads en pesos y la evolución de cada red, con botones
que saltan a la pestaña correspondiente.

**7. Tab Redes y Tab Seguimiento vivían solo en `localStorage`.**
Los snapshots diarios y los tokens se perdían al limpiar el navegador, no aparecían en ningún
Excel ni reporte, y el token viajaba en claro al frontend.
→ Nuevos endpoints, con persistencia en `clientes/{slug}/redes.json`:

| Método | Ruta |
|---|---|
| `GET` | `/api/cliente/:slug/redes` — config (token enmascarado) + snapshots + stats |
| `PUT` | `/api/cliente/:slug/redes/:plataforma` — guardar `ig` / `fb` / `tt` |
| `POST` | `/api/cliente/:slug/redes/snapshot` — un registro por fecha+red (reescribe si repites el día) |
| `DELETE` | `/api/cliente/:slug/redes/snapshot?fecha=&red=` |
| `GET` | `/api/redes/:plataforma/:slug/probar` — proxy de prueba de conexión |

El token **nunca vuelve al navegador**: el servidor devuelve `token: ""` + `tiene_token: true`, y
guardar con el campo vacío conserva el que ya estaba. `redes.json` quedó en `.gitignore`.

**8. Proxy de TikTok** *(era el pendiente #1 del backlog)*.
El botón "Probar conexión" de TikTok no podía funcionar desde el navegador por CORS. Ahora las
tres plataformas usan el mismo endpoint del servidor y el botón se comporta igual en las tres.

**9. No había forma de crear un cliente desde la interfaz.**
`POST /api/cliente/nuevo` existía desde el principio pero ninguna pantalla lo llamaba: había que
crear las carpetas a mano. Además dejaba al cliente sin `identity.json`, así que el Tab Cliente
salía vacío y el selector lo mostraba por su slug.
→ Botón **➕ Nuevo cliente** en el header con formulario, y el endpoint ahora genera `identity.json`
semilla (con los 47 campos marcados `[POR DEFINIR]`), `identity.md`, `objetivos.json`, `estados.json`,
`leads.json` y `redes.json`. Un cliente nuevo abre las 12 pestañas sin un solo error.

**10. El mensaje de error de "Actualizar" mandaba a abrir PowerShell.** Corregido a un comando
neutro que funciona en este Mac.

---

## 3. Lo que revisé y está bien

- **Postgres + Meilisearch** están corriendo y sus endpoints responden (`/api/db/*`, `/api/search`).
  Ninguna pestaña los consume todavía — son una capa paralela a los archivos JSON, no una
  desconexión rota. Si en algún momento quieres buscador global en el dashboard, la base ya está.
- **Validador de parrillas** (R1–R10): la parrilla de prueba pasa con **10/10**, 0 errores y 0 warnings.
- **Pipeline completo** prompt → JSON → validador → Excel: verificado en vivo.
- **Módulo SEO**: probado contra una web real, 14 checks, inyecta el identity del cliente correctamente.
- **File watcher** (chokidar) regenera `data.js` al tocar archivos de cliente: verificado.

---

## 4. Cliente ficticio de prueba: `aurora-bakehouse`

**Aurora Bakehouse SAS** — panadería artesanal en Bogotá. Es una empresa **inventada**, creada solo
para que puedas abrir cada pestaña y ver información real en pantalla. Está marcada como ficticia
en su `_historial.md`. Su `website_url` apunta a `example.com` (el dominio reservado para ejemplos)
para que el Tab SEO tenga algo real que auditar.

Para borrarla cuando ya no la necesites:

```bash
rm -rf clientes/aurora-bakehouse
curl -X POST http://localhost:3737/api/regenerar
```

### Qué vas a ver en cada pestaña

| # | Pestaña | Datos cargados |
|---|---------|----------------|
| 1 | 🆔 Cliente | Identity **10/10** — los 47 campos llenos, los 8 bloques del schema |
| 2 | 🎯 Estrategia | Julio 2026: objetivo macro, 6 KPIs con reales vs meta (semáforo 🟢🟢🟢🟡🟡🟡), mix 45/35/20, 4 semanas con foco y resultados |
| 3 | 📣 Contenido | 41 skills, generadores de parrilla/stories/ads/captación/ventas/medición |
| 4 | 📁 Producción | Kanban con 18 items (9 publicados, 3 programados, 2 en aprobación, 1 en producción, 3 en guion) + 7 archivos en las 4 carpetas |
| 5 | 📅 Calendario | Julio con las 12 piezas y 6 stories ubicadas por día y coloreadas por estado |
| 6 | 👥 Leads | 9 leads en los 6 estados del CRM · pipeline **$14.210.000** · 2 convertidos |
| 7 | 📊 Resumen | Todo lo anterior consolidado en una vista |
| 8 | 📈 Historial | 18 piezas, 5 entregas en bitácora, 8 ángulos distribuidos |
| 9 | 🔍 SEO | Auditoría real de la URL, 14 checks, plan de mejoras priorizado |
| 10 | 📲 Redes | 3 cuentas configuradas + **11 snapshots** de julio (IG/FB/TikTok) |
| 11 | 🔎 Seguimiento | IG +517 seg. (eng. 5,7%) · FB +91 (3,9%) · TikTok +562 (8,2%) |
| 12 | 🧩 Herramientas | Excel Master de 8 hojas, Reporte mensual con texto de WhatsApp, Ideas, Research, AI CEO, CRO |

Los números están cruzados a propósito: el crecimiento de Instagram (**+517**) es exactamente el
resultado real de seguidores en el Tab Estrategia, y los leads del CRM (**9**, 2 convertidos)
son los que aparecen en el Resumen y en el Reporte mensual. Así se ve si algo se desconecta.

### Archivos de salida generados

```
clientes/aurora-bakehouse/
├── 00-identity/identity.json + identity.md
├── 01-contenido/parrillas/parrilla-2026-07-01-09-00.json + .xlsx   ← valida 10/10
├── 01-contenido/stories/stories-2026-07-29-13-40.json + .xlsx
├── 02-paid-ads/meta-ads/meta-ads-2026-07-14-b2b.md
├── 03-email/email-bienvenida-caja-aurora.md
├── 04-landing-pages/landing-encargos-2026-07.md
├── objetivos.json · estados.json · leads.json · redes.json
└── _historial.md
```

---

## 5. Lo que sigue pendiente

Sin resolver de la lista original (no entraban en este alcance):

- **PASO 5** — links de aprobación para clientes con token de 7 días.
- **PASO 13** — panel de integraciones (Search Console + Meta Ads).
- **Cifrado de los tokens en disco.** Ya no viajan al navegador ni entran al repo, pero en
  `redes.json` siguen en texto plano. El siguiente paso natural es AES con clave en `.env`.
- **Gráfica de evolución** en Tab Redes — los datos ya están en el servidor, falta dibujarlos.
- **Auto-extracción de métricas** vía Graph API Insights (alcance e impresiones, no solo seguidores).
- **`timekeepers-ai` no tiene `identity.json`** — es la única prueba que falla en todo el sistema.
- **Postgres y Meilisearch sin consumir** desde el dashboard.
