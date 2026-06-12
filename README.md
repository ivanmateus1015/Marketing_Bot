# TimeKeepers AI — Workspace de Producción

## 1. Qué es este workspace

Sistema de producción centralizado para la agencia **TimeKeepers AI** (Bogotá, Colombia). Combina identidades de marca por cliente, historial de producción, 41 skills especializadas de marketing, y un dashboard interactivo para generar prompts listos para usar en Claude Code. Ivan opera todo internamente; los clientes reciben los outputs por email o Google Drive y nunca acceden a este sistema.

---

## 2. Estructura de carpetas

```
timekeepers-workspace/
├── .claude/
│   └── skills/                  ← 41 skills de marketing (Corey Haines)
│       ├── copywriting/
│       ├── social-content/
│       └── ... (39 más)
├── clientes/
│   ├── _plantilla/              ← Plantilla base para nuevos clientes
│   ├── draken-vip/              ← Draken VIP Limousine (Plan Deluxe)
│   ├── urbex-architecture/      ← Urbex Architecture & Design (Plan Deluxe)
│   ├── maria-fernanda/          ← Maria Fernanda (Plan Estándar)
│   └── timekeepers-ai/          ← TimeKeepers AI (casa)
│       ├── 00-identity/
│       │   └── identity.md      ← SIEMPRE leer primero
│       ├── 01-contenido/
│       │   ├── parrillas/
│       │   ├── stories/
│       │   └── reels/
│       ├── 02-paid-ads/
│       │   ├── meta-ads/
│       │   └── google-ads/
│       ├── 03-email/
│       ├── 04-landing-pages/
│       └── _historial.md        ← SIEMPRE leer segundo
├── plantillas/
│   ├── identity-template.md     ← Plantilla maestra de identity
│   └── readme-onboarding-cliente.md
├── n8n-workflows/               ← Exportaciones de workflows n8n (.json)
├── outputs-generados/           ← Outputs finales listos para entregar
├── scripts/
│   └── actualizar-dashboard.js  ← Script Node.js generador de data.json
├── data/
│   └── data.json                ← Generado por el script — no editar manualmente
├── dashboard.html               ← Dashboard interactivo (abrir en navegador)
├── CLAUDE.md                    ← Cerebro del workspace — reglas globales
└── README.md                    ← Este archivo
```

---

## 3. Cómo abrir y usar el dashboard

**Paso 1** — Genera el archivo de datos (requiere Node.js instalado):

```bash
node scripts/actualizar-dashboard.js
```

Verás en consola algo como:
```
✓ draken-vip          0 archivos de output
✓ urbex-architecture  0 archivos de output
✓ timekeepers-ai      0 archivos de output
✓ maria-fernanda      0 archivos de output
✓ 41 skills cargadas
✅ data.json generado — Clientes: 4 | Skills: 41
```

**Paso 2** — Abre `dashboard.html` directamente en tu navegador (doble click o arrastra al browser).

**Paso 3** — Selecciona un cliente en el dropdown del header. El dashboard carga:
- Info del cliente y métricas de producción en el sidebar
- Skills disponibles según el plan del cliente
- Botón "🚀 Prompt" en cada skill para generar un prompt listo para copiar

> Ejecuta el script cada vez que agregues contenido nuevo para que el dashboard refleje el estado actual.

---

## 4. Cómo agregar un cliente nuevo

1. **Copia la plantilla base:**
   ```
   clientes/_plantilla/ → clientes/nuevo-cliente/
   ```
   Renombra la carpeta con el slug del cliente (minúsculas, sin espacios, guiones).

2. **Llena el identity:**
   Edita `clientes/nuevo-cliente/00-identity/identity.md` con todos los datos del cliente. Referencia: `plantillas/identity-template.md`.

3. **Actualiza el historial:**
   Edita `clientes/nuevo-cliente/_historial.md` — cambia el nombre del cliente en el encabezado y el plan activo.

4. **Regenera el dashboard:**
   ```bash
   node scripts/actualizar-dashboard.js
   ```
   Recarga el browser (F5) y el nuevo cliente aparece en el dropdown.

---

## 5. Cómo trabajar con Claude Code

### Opción A — Usar el dashboard (flujo recomendado)

1. Abre `dashboard.html` en el browser
2. Selecciona el cliente
3. Encuentra la skill que necesitas (busca o filtra por categoría)
4. Click en "🚀 Prompt" → escribe qué quieres crear → copia el prompt generado
5. Pega el prompt en Claude Code y ejecuta

El prompt generado incluye automáticamente:
- El cliente y plan seleccionado
- La skill activa
- Instrucciones para leer identity + historial antes de generar
- El path de output sugerido
- La instrucción de actualizar `_historial.md` con score

### Opción B — Lenguaje natural directo en Claude Code

Habla directamente sin necesidad del dashboard. Claude lee este `CLAUDE.md` y aplica el flujo correcto:

```
"Hazme la parrilla de junio para Draken VIP"
"Genera 5 stories cadena para Urbex sobre un proyecto residencial"
"Crea campaña Meta Ads para TimeKeepers AI con presupuesto $300 USD"
```

---

## 6. Comandos comunes — ejemplos

| Prompt | Resultado esperado |
|--------|-------------------|
| `Hazme la parrilla de julio para Draken VIP` | 12–16 posts mensuales con diversidad de ángulos |
| `Genera 5 stories cadena para Urbex sobre diseño sostenible` | Secuencia narrativa de 5 slides |
| `Crea campaña Meta Ads para Draken con presupuesto $500 USD` | Brief completo: objetivo, audiencias, copy de anuncios |
| `Audita el Identity de Maria Fernanda y dime qué falta` | Revisión campo por campo con gaps identificados |
| `Genera email de bienvenida para Urbex Architecture` | Email onboarding con tono sofisticado + CTA |
| `Crea 3 variantes A/B de headline para TimeKeepers AI` | 3 opciones con justificación psicológica |
| `Dame 10 ideas de contenido para TimeKeepers AI para junio` | Ideas con ángulo, formato y hook de apertura |
| `Genera brief de imagen para Draken — post ejecutivo` | Brief para diseñador: composición, paleta, texto |
| `Crea secuencia de 3 emails de re-engagement para Urbex` | Email 1 check-in · Email 2 valor · Email 3 urgencia |
| `Analiza competidores de Draken y dame ángulos diferenciadores` | Requiere skill competitor-profiling (Plan Deluxe) |

---

## 7. Troubleshooting

**`data.json` no se genera / error al correr el script**
- Verifica que Node.js está instalado: `node --version`
- Asegúrate de estar en la carpeta raíz del workspace al correr el script
- El script requiere Node.js 14+ (usa `fs` y `path` nativos)

**El dashboard aparece vacío o muestra "Dashboard no inicializado"**
- Corre `node scripts/actualizar-dashboard.js` primero
- Recarga el browser con F5
- Si abres el archivo directamente desde el sistema de archivos (protocolo `file://`) y el fetch falla por CORS, usa un servidor local: `npx serve .` o la extensión Live Server de VS Code

**Una skill no aparece o aparece atenuada**
- Las skills atenuadas están fuera del plan del cliente seleccionado
- Activa el toggle "Deluxe" para verlas todas
- Verifica que existe `clientes/{cliente}/00-identity/identity.md` con el campo `Plan:` correcto

**El modal de prompt no copia al portapapeles**
- El browser puede bloquear `clipboard.writeText` en `file://` — usa el servidor local (ver arriba)
- Alternativa: selecciona el texto del prompt manualmente y copia con Ctrl+C

**Un cliente nuevo no aparece en el dashboard**
- Verifica que la carpeta está en `clientes/` y **no** empieza con `_` (las que empiezan con `_` se ignoran)
- Vuelve a correr el script de actualización

**`_historial.md` no se actualiza solo**
- El historial es actualizado por Claude Code al final de cada sesión de producción, no automáticamente
- Si Claude no actualizó el historial, pídele explícitamente: "Actualiza el historial de Draken con el post que acabamos de crear"

---

## 8. Estructura de Identity por cliente — referencia rápida

Cada `identity.md` tiene 8 secciones. Las más críticas para producción:

| Sección | Uso en producción |
|---------|------------------|
| **§2 Producto/Servicio** | Define qué se puede comunicar y cómo |
| **§3 Audiencia** | Informa el tono, lenguaje y ángulos del contenido |
| **§4 Posicionamiento** | Tagline, promesa de valor, tono de voz, palabras prohibidas |
| **§6 Reglas de marca** | Hashtags obligatorios/prohibidos, emojis, estilo visual |
| **§7 Plan contratado** | Define qué skills están disponibles |
| **§8 Notas operativas** | Stakeholder, canal, sensibilidades — solo uso interno |

> Si un campo dice `[POR CONFIRMAR]` o `[POR DEFINIR]`, no uses ese campo en contenido y avísale a Ivan que falta completarlo.

---

*TimeKeepers AI — Sistema interno. No compartir con clientes.*
