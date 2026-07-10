# CLAUDE.md — Cerebro del Workspace TimeKeepers AI

> Este archivo es la fuente de verdad operativa. Léelo completo antes de cualquier acción.

---

## 1. Identidad del Workspace

- **Agencia:** TimeKeepers AI
- **Fundador / CTO / Operador único:** Ivan
- **Ubicación:** Bogotá, Colombia
- **Modo de operación:** Centralizado — Ivan opera todo. Los clientes nunca ven este sistema. Los outputs se entregan por email o Google Drive.
- **Planes comerciales activos:**
  - Plan Estándar: $900 USD/mes
  - Plan Deluxe: $1,500 USD/mes
- **Paleta de marca:** Navy `#0A1F44` · Gold `#D4AF37` · Fondo `#FAFAF7`
- **Stack técnico:** n8n 2.10.4 self-hosted · Perplexity (sonar / sonar-pro) · Gemini 2.5 Pro · Google Sheets

---

## 2. Reglas Globales de Comportamiento

### Idioma
- Responder siempre en **español**, salvo que el contexto del cliente sea explícitamente en inglés (ej: Draken VIP puede requerir outputs en inglés).

### Flujo obligatorio ANTES de crear cualquier output para un cliente

1. Leer `clientes/{cliente}/00-identity/identity.md`
2. Leer `clientes/{cliente}/_historial.md`
3. Leer outputs previos relevantes en la subcarpeta correspondiente (`parrillas/`, `meta-ads/`, etc.)

Sin cumplir estos 3 pasos, **no generar nada**.

### Flujo obligatorio DESPUÉS de crear contenido

Actualizar `clientes/{cliente}/_historial.md` con:
- Fecha ISO (ej: `2026-05-06`)
- Tipo de pieza (parrilla, story, ad, email, etc.)
- Nombre del archivo creado
- Skills aplicadas
- Ángulos usados
- Score interno

### Score mínimo aceptable: 9.0 / 10

Si el output no alcanza 9.0, avisar a Ivan antes de entregar. No silenciar outputs de baja calidad.

### Reglas para n8n

- Sintaxis de expresiones: `{{ $json["Campo"] }}` — comillas dobles limpias, NUNCA escapadas
- Prohibido usar `new Set()` — incompatible con n8n 2.10.4. Usar `.filter()` con `.indexOf()` para deduplicar
- Preferir nodos nativos de n8n sobre Code nodes cuando sea posible
- Documentar cada nodo con su propósito en el campo `notes`

### Comportamiento general

- Token-conscious: respuestas concisas, sin explicaciones obvias
- Si hay ambigüedad en una instrucción, preguntar antes de inventar
- Si una operación falla, avisar y proponer alternativa
- No crear archivos fuera de la estructura de carpetas definida sin confirmación de Ivan

---

## 3. Mapeo de Skills por Plan Comercial

### Plan Estándar — 10 skills core

| # | Skill | Uso principal |
|---|-------|---------------|
| 1 | `copywriting` | Copy persuasivo para cualquier formato |
| 2 | `social-content` | Posts, parrillas, contenido orgánico |
| 3 | `email-sequence` | Secuencias de email marketing |
| 4 | `copy-editing` | Revisión y mejora de copy existente |
| 5 | `marketing-psychology` | Principios psicológicos aplicados al copy |
| 6 | `customer-research` | Análisis de audiencia y buyer persona |
| 7 | `content-strategy` | Estrategia de contenido y calendario |
| 8 | `image` | Briefings y prompts para imágenes |
| 9 | `marketing-ideas` | Generación de ideas de campaña |
| 10 | `popup-cro` | Optimización de popups y micro-conversiones |

### Plan Deluxe — 39 skills (todo lo anterior +)

| # | Skill | Categoría |
|---|-------|-----------|
| 11 | `paid-ads` | Paid & Distribution |
| 12 | `ad-creative` | Paid & Distribution |
| 13 | `ab-test-setup` | Measurement & Testing |
| 14 | `analytics-tracking` | Measurement & Testing |
| 15 | `page-cro` | Conversion Optimization |
| 16 | `signup-flow-cro` | Conversion Optimization |
| 17 | `onboarding-cro` | Conversion Optimization |
| 18 | `form-cro` | Conversion Optimization |
| 19 | `paywall-upgrade-cro` | Conversion Optimization |
| 20 | `churn-prevention` | Retention |
| 21 | `seo-audit` | SEO & Discovery |
| 22 | `ai-seo` | SEO & Discovery |
| 23 | `programmatic-seo` | SEO & Discovery |
| 24 | `schema-markup` | SEO & Discovery |
| 25 | `site-architecture` | SEO & Discovery |
| 26 | `competitor-alternatives` | Strategy & Monetization |
| 27 | `competitor-profiling` | Strategy & Monetization |
| 28 | `sales-enablement` | Sales & RevOps |
| 29 | `revops` | Sales & RevOps |
| 30 | `cold-email` | Sales & RevOps |
| 31 | `lead-magnets` | Growth Engineering |
| 32 | `free-tool-strategy` | Growth Engineering |
| 33 | `referral-program` | Growth Engineering |
| 34 | `community-marketing` | Growth Engineering |
| 35 | `launch-strategy` | Strategy & Monetization |
| 36 | `pricing-strategy` | Strategy & Monetization |
| 37 | `video` | Content & Copy |
| 38 | `directory-submissions` | SEO & Discovery |
| 39 | `aso-audit` | SEO & Discovery |

---

## 4. Estructura Estándar por Cliente

Cada cliente tiene esta estructura bajo `clientes/{slug-cliente}/`:

```
{slug-cliente}/
├── 00-identity/
│   └── identity.md          ← LEER SIEMPRE PRIMERO
├── 01-contenido/
│   ├── parrillas/            ← Posts de feed, calendarios de contenido
│   ├── stories/              ← Instagram Stories, secuencias narrativas
│   └── reels/                ← Scripts y conceptos para video corto
├── 02-paid-ads/
│   ├── meta-ads/             ← Facebook + Instagram Ads
│   └── google-ads/           ← Search, Display, Performance Max
├── 03-email/                 ← Secuencias, newsletters, drips
├── 04-landing-pages/         ← Copy y estructura de landing pages
└── _historial.md             ← LEER SIEMPRE SEGUNDO
```

**Slugs de clientes activos:**
- `draken-vip` — Draken VIP Limousine (Plan Deluxe)
- `urbex-architecture` — Urbex Architecture & Design SAS (Plan Deluxe)
- `maria-fernanda` — Maria Fernanda (Plan Estándar)
- `timekeepers-ai` — TimeKeepers AI (casa — Ivan opera directamente)

---

## 5. Reglas de Calidad de Output

### Posts de Instagram (feed) — Límites por formato

| Formato | Campo | Máx palabras | Tono |
|---------|-------|-------------|------|
| Reel | `caption_post` | 60 palabras | Impactante, 3-5 líneas cortas, no informativo |
| Foto | `caption_post` | 80 palabras | Reflexivo o comparativo, con emoción o dato fuerte |
| Carrusel | `caption_post` | 50 palabras | Gancho puro — incita a swipear, no resume los slides |
| Carrusel | `copy_slides` | `texto_principal` ≤7 palabras · `texto_apoyo` ≤15 palabras | Brief para diseñador — ver Schema Sección 8 |

- Estructura recomendada: gancho → desarrollo → CTA
- CTA concreto y accionable (no genérico)
- CTA en español neutro por defecto; Draken puede usar inglés o español según contexto
- Hashtags: pertinentes al cliente, nunca prohibidos según su Identity

### Diversidad de ángulos (anti-redundancia)
En una parrilla o entrega múltiple, los ángulos deben distribuirse. No repetir el mismo ángulo más de 2 veces seguidas. Ángulos disponibles:

`Ejecutivo` · `Aspiracional` · `Educativo` · `Lifestyle` · `Comparativo` · `Caso de éxito` · `Detrás de cámaras` · `Promocional`

### Tono por cliente
| Cliente | Tono primario | Notas |
|---------|---------------|-------|
| Draken VIP | Ejecutivo + aspiracional | Bilingüe; inglés primario en contenido USA |
| Urbex Architecture | Sofisticado + técnico + visual | Score previo 9.4/10 — mantener nivel |
| Maria Fernanda | Cercano + aspiracional | Marca personal; identity por construir |

### Regla de entrega
Nunca entregar un output con score < 9.0 sin avisarle a Ivan explícitamente. Si el output es 8.x, indicar por qué y ofrecer reintento o ajuste.

### 9 Reglas de Calidad Obligatorias — Parrillas

Antes de entregar cualquier parrilla, validar CADA pieza contra estas reglas. Si alguna falla, regenerar esa pieza antes de entregar.

**R1 — Ley de los 0.8 segundos (Reels)**
En todo Reel, el texto overlay del hook DEBE estar en Frame 1 (0.0s). Formato obligatorio del campo HOOK:
`"Frame 1 (0.0s): [descripción visual] + texto overlay inmediato '[hook ≤7 palabras]' · [specs]"`
PROHIBIDO: "texto overlay en segundo 2", "tras los primeros segundos", o cualquier variante que retrase el texto.

**R2 — Cierre de caption_post en Conversión**
Todo `caption_post` con objetivo Conversión / Lead Generation DEBE cerrar con uno de:
- Formato A: "El cliente promedio [ahorra/reduce/gana] [X días / X% / $X] cuando..."
- Formato B: "El mes pasado un cliente llegó con [problema]. Lo entregamos en [tiempo]. Sin sobrecostos."
- Formato C: "¿Cuánto te ha costado ya [problema que la pieza describe]?"
PROHIBIDO: "Así es como lo hacemos." / "Ese es nuestro proceso." / "Así es el modelo [X] real." / "Eso es trabajar con nosotros."

**R3 — Matriz de CTAs por formato × objetivo**
| Formato | Objetivo | CTA obligatorio |
|---------|----------|----------------|
| Carrusel | Awareness | Guardar + Compartir |
| Carrusel | Conversión | Pregunta cerrada al DM con keyword |
| Reel | Awareness | Pregunta abierta + tag a alguien |
| Reel | Conversión | DM con palabra clave activadora |
| Foto | Awareness | Pregunta BINARIA "¿A o B? Vota en comentarios" |
| Foto | Conversión | DM directo |

**R4 — Coherencia banco de material ↔ prioridad**
- Piezas ALTA: solo material ★★★★+
- Si no hay ★★★★+ para una pieza ALTA, marcar en ESTADO del banco: `"⚠️ GAP DE MATERIAL — Pieza #N requiere [tipo] ★★★★+ para [ubicación]. Material actual ★★★ insuficiente para prioridad ALTA."`
- Material ★★★: solo asignar a piezas MEDIA o BAJA.

**R5 — Tesis obligatoria por pieza (filtro interno)**
Antes de generar el caption, escribir internamente: `"TESIS: [afirmación contraintuitiva o de toma de posición]"`
Si la tesis no sorprende o podría aparecer en la cuenta de un competidor → REGENERAR la pieza.
Tesis inválidas: "La arquitectura es importante." / "Diseñar bien mejora tu vida." / "Nuestro equipo es profesional."

**R6 — Diversidad de patrón en carruseles**
Rotar entre 4 patrones. No repetir el mismo en dos carruseles consecutivos. Declarar siempre en el campo MATERIAL: `"PATRÓN [A/B/C/D] · [descripción de slides]"`
- Patrón A: Pregunta-hook → 4 conceptos clave → CTA
- Patrón B: Problema → 3 errores comunes → Solución → CTA
- Patrón C: "[N] señales de que..." → una por slide → Caso/ejemplo → CTA
- Patrón D: "Lo que te dijeron vs la verdad" → mito↔realidad × 4 → Tesis final → CTA

**R7 — Naturalidad del diálogo en Reels con voz en off**
Si el Reel tiene voz en off: frases máx 12 palabras. PROHIBIDO: "lo cual", "el mismo", "dicho de otro modo", "es por ello que", "no obstante", "sin embargo" (usar "pero"). PROHIBIDO enumerar "primero, segundo, tercero" — usar "lo siguiente", "y aquí está lo importante".
Agregar en campo MATERIAL: `"GUION HABLADO: [copy oral frase por frase, pausas con /]"`

**R8 — AUTO-QA obligatorio**
Agregar campo `"auto_qa"` en cada pieza con formato: `"[X/Y] aprobados · [ítems fallidos o 'todos los ítems aplicables aprobados'] · QA Técnico: aprobado"`
Ítems a validar (solo los aplicables según formato/objetivo):
- Hook en frame 1 (solo Reels)
- Cierre no tautológico (solo Conversión)
- CTA coincide con matriz R3
- Material ≥ ★★★★ (solo ALTA)
- Tesis contraintuitiva identificable
- Patrón declarado y distinto al anterior (solo Carrusel)
- Guion hablado incluido (solo Reel con voz en off)
- QA Técnico R9 completo (hashtags, ortografía, orden, keywords en caption, lenguaje no artificial)

**R9 — QA Técnico de Output Final**
Antes del output final, validar técnicamente cada pieza:
- [ ] Ningún hashtag duplicado dentro de la misma pieza
- [ ] Ortografía correcta de todos los hashtags (revisar tildes y consonantes — ej: `#LicenciasConstruccion`, no `#LicenciasContruccion`)
- [ ] Ningún hashtag idéntico entre posición #1 y #2 de la misma pieza
- [ ] Hashtags en orden: **marca → genérico/servicio → geográfico** (el geográfico siempre al final)
- [ ] `caption_post` con OBJETIVO=Conversión incluye la palabra clave del CTA dentro del texto (no solo en el campo `cta`)
- [ ] Piezas promocionales evitan lenguaje de urgencia artificial ("últimos espacios", "solo quedan X", "oferta por tiempo limitado") — usar exclusividad implícita en su lugar

Si algún ítem falla, corregir antes de entregar. Añadir al campo `auto_qa`: `"· QA Técnico: aprobado"` o lista de correcciones aplicadas.

---

## 6. Comandos Rápidos Típicos

Estos son los prompts más frecuentes que Ivan usará. Al recibirlos, ejecutar el flujo completo (leer identity + historial + outputs previos → generar → actualizar historial).

```
"Hazme la parrilla de [mes] para [cliente]"
→ Genera 12–16 posts mensuales con diversidad de ángulos obligatoria

"Genera 5 stories cadena para [cliente] sobre [tema]"
→ Secuencia narrativa de 5 slides con continuidad visual y textual

"Crea campaña Meta Ads para [cliente] con presupuesto [X]"
→ Estructura completa: objetivo, audiencias, creativos (copy + visual brief), copy de cada anuncio

"Audita el Identity de [cliente] y dime qué falta"
→ Revisa identity.md campo por campo e identifica vacíos o inconsistencias

"Genera email de bienvenida para [cliente]"
→ Email de onboarding con tono del cliente, CTA principal, estructura AIDA o PAS

"Crea 3 variantes A/B de headline para [cliente] en [contexto]"
→ 3 headlines con ángulos distintos, justificación psicológica de cada uno

"Dame ideas de contenido para [cliente] para [mes/temporada]"
→ 10 ideas con ángulo, formato sugerido y hook de apertura

"Genera brief de imagen para [cliente] — post [descripción]"
→ Brief detallado para diseñador: composición, paleta, mood, texto superpuesto

"Crea secuencia de 3 emails de re-engagement para [cliente]"
→ Email 1 (check-in suave) · Email 2 (valor) · Email 3 (urgencia / CTA fuerte)

"Analiza competidores de [cliente] y dame ángulos diferenciadores"
→ Requiere skill competitor-profiling + competitor-alternatives (solo Plan Deluxe)
```

---

## 8. Schema JSON de Parrilla de Contenido

Cuando el prompt de parrilla lo indique, el output debe ser un archivo `.json` con el siguiente schema exacto. El servidor lo convierte a Excel con 3 hojas (endpoint: `GET /api/cliente/:slug/parrilla-excel?archivo=<nombre>.json`).

### REGLA FUNDAMENTAL — caption_post vs copy_slides

| Campo | Qué es | Quién lo usa | Aplica a |
|-------|--------|--------------|----------|
| `caption_post` | Texto que se publica en Instagram debajo de la imagen. **Copy-paste directo al post.** | Community manager | Todos los formatos |
| `copy_slides` | Texto que va **dentro** de cada imagen del carrusel. Brief para el diseñador gráfico. | Diseñador gráfico | Solo Carrusel |

**PROHIBIDO** meter el copy de los slides dentro de `caption_post`. Son dos campos distintos para dos personas distintas.

```json
{
  "meta": {
    "cliente": "slug-del-cliente",
    "slug": "slug-del-cliente",
    "evento": "Nombre del evento o null",
    "semanas": 2,
    "total_piezas": 14,
    "generado": "YYYY-MM-DD"
  },
  "piezas": [
    {
      "numero": 1,
      "semana": 1,
      "fecha": "Lun 2 Jun",
      "dia": "Lunes",
      "formato": "Reel",
      "titulo": "Título / Concepto de la pieza",
      "caption_post": "Gancho en la primera línea.\n\nDesarrollo en 2-3 líneas cortas.\n\nCTA natural al cierre. Máx 60 palabras.",
      "material": "Descripción del material visual requerido.\n\nGUION HABLADO: frase 1 / frase 2 / frase 3 (solo si Reel con voz en off)",
      "hook_primer_frame": "Frame 1 (0.0s): [descripción visual] + texto overlay inmediato '[hook ≤7 palabras]' · [specs]",
      "cta": "DM 'KEYWORD' ✉️",
      "keyword_dm": "KEYWORD",
      "hashtags": "#MarcaCliente #Genérico1 #Genérico2 #Geográfico",
      "objetivo": "Conversión / Lead Generation",
      "angulo": "Caso de éxito",
      "nivel_produccion": "MEDIO",
      "hora_sugerida": "Lun 19:00–21:00",
      "estado": "⬜ Pendiente",
      "auto_qa": "6/6 aprobados · todos los ítems aplicables aprobados · QA Técnico: aprobado"
    },
    {
      "numero": 2,
      "semana": 1,
      "fecha": "Mié 4 Jun",
      "dia": "Miércoles",
      "formato": "Carrusel",
      "titulo": "Título del carrusel",
      "caption_post": "Gancho que hace que abran el carrusel. Máx 50 palabras. Es la razón para swipear — no el resumen de los slides.",
      "copy_slides": [
        {
          "slide": 1,
          "rol": "Gancho",
          "texto_principal": "Titular de impacto ≤7 palabras",
          "texto_apoyo": "Subtítulo o dato de contexto ≤15 palabras",
          "visual": "Descripción para el diseñador: fondo, color, foto, tipografía de este slide específico"
        },
        {
          "slide": 2,
          "rol": "Desarrollo",
          "texto_principal": "Concepto o punto 1 ≤7 palabras",
          "texto_apoyo": "Detalle o dato de soporte ≤15 palabras",
          "visual": "Visual slide 2: descripción para el diseñador"
        },
        {
          "slide": 7,
          "rol": "CTA",
          "texto_principal": "Una sola acción ≤7 palabras",
          "texto_apoyo": "Keyword + logo ≤10 palabras",
          "visual": "Fondo oscuro sólido + logo del cliente prominente + elemento CTA visual claro"
        }
      ],
      "material": "PATRÓN [A/B/C/D] · [N] slides · Paleta: [colores del cliente] · Tipografía: [fuente]",
      "hook_primer_frame": "Slide 1: [descripción del primer frame] · [contraste visual esperado]",
      "cta": "Guarda + Comparte 📐",
      "keyword_dm": null,
      "hashtags": "#MarcaCliente #Genérico1 #Genérico2 #Geográfico",
      "objetivo": "Awareness",
      "angulo": "Educativo",
      "nivel_produccion": "FÁCIL",
      "hora_sugerida": "Mié 19:00–21:00",
      "estado": "⬜ Pendiente",
      "auto_qa": "5/5 aprobados · todos los ítems aplicables aprobados · QA Técnico: aprobado"
    }
  ],
  "guia_produccion": [
    {
      "numero": 1,
      "pieza": "Reel #1 — Nombre corto",
      "brief_diseñador": "Una oración de instrucción para el editor o diseñador: qué hace visualmente, cómo se siente, qué resultado busca.",
      "tipo_edicion": "Descripción del estilo de edición requerido",
      "specs_tecnicas": "9:16 · 20-30s · 1080×1920 · Texto overlay Poppins bold blanco",
      "musica_mood": "Género · BPM: XX-XX · Sin letra · Mood: [3 adjetivos]",
      "prioridad": "ALTA"
    }
  ],
  "banco_material": [
    {
      "numero": 1,
      "descripcion": "Video: entrada del pasajero al vehículo — ángulo lateral",
      "tipo": "VIDEO",
      "uso_sugerido": "Reel de apertura del evento",
      "calidad": "★★★★☆",
      "piezas_asignadas": "Pieza #1, Pieza #3",
      "estado": "⬜ Sin editar"
    }
  ]
}
```

### Criterios de `nivel_produccion`

| Nivel | Qué implica | Ejemplo típico |
|-------|-------------|----------------|
| FÁCIL | Solo diseño gráfico con material disponible, o foto de portafolio existente | Carrusel tipográfico, foto editorial |
| MEDIO | Reel con material ya filmado, o carrusel fotográfico de archivo | Reel antes/después con videos grabados |
| DIFÍCIL | Requiere sesión de grabación nueva o sesión fotográfica dedicada | Reel documental de obra activa |

### Criterios de `hora_sugerida`

| Objetivo / Tipo de pieza | Ventana óptima |
|--------------------------|----------------|
| Awareness / Lifestyle | 18:00–20:00 cualquier día de semana |
| Conversión | 12:00–14:00 o 19:00–21:00 |
| Educativo / Carrusel | 07:00–09:00 o 19:00–21:00 |
| Foto aspiracional | Viernes–Sábado 12:00–18:00 |

### Regla R10 (NUEVA) — Integridad de copy_slides

Solo para piezas con `"formato": "Carrusel"`:
- `copy_slides` es **OBLIGATORIO** — sin él, el diseñador no tiene brief y la pieza no se puede producir.
- `texto_principal` de cada slide: máx 7 palabras (tipografía grande — si no cabe, dividir en más slides).
- `texto_apoyo`: máx 15 palabras (dato de soporte, subtítulo, lectura rápida).
- Slide 1 siempre tiene `"rol": "Gancho"` — detiene el scroll.
- Último slide siempre tiene `"rol": "CTA"` con una sola acción.
- `caption_post` es el texto del POST de Instagram — nunca repite el copy de los slides.
- PROHIBIDO: copiar el contenido de `copy_slides` dentro de `caption_post`.

### Roles válidos en copy_slides

| Rol | Descripción | Posición típica |
|-----|-------------|-----------------|
| `Gancho` | Detiene el scroll. Pregunta fuerte o afirmación contraintuitiva. | Slide 1 siempre |
| `Desarrollo` | Construye el argumento o lista. Cada slide jala al siguiente. | Slides 2-N-1 |
| `Clímax` | Dato sorpresivo, revelación o punto de mayor tensión. | Penúltimo o central |
| `CTA` | Cierre con una sola acción clara. | Último slide siempre |

### Actualización de R8 — ítems adicionales de AUTO-QA

Agregar a la lista de validación de auto_qa:
- `caption_post` dentro del límite de palabras por formato (Reel ≤60, Foto ≤80, Carrusel ≤50)
- `copy_slides` presente y correcto en todas las piezas tipo Carrusel (R10)
- `keyword_dm` declarada (no null) en todas las piezas de Conversión / Lead Generation
- `nivel_produccion` y `hora_sugerida` declarados en toda pieza

### Reglas de idioma para parrillas
- **Español de Colombia** como idioma principal en captions, títulos y CTAs
- Excepción: cliente Draken VIP puede usar inglés americano si el contexto es mercado USA
- Los hashtags van siempre en el idioma del mercado objetivo del cliente

### Columnas que mapean al Excel de referencia (formato v2 — hoja única `📋 Parrilla + Script`)

| Col | Campo JSON | Header Excel | Notas |
|-----|-----------|--------------|-------|
| 1 | `numero` | `#` | Navy oscuro, blanco centrado |
| 2 | `fecha` | `FECHA / DATE` | |
| 3 | `dia` | `DÍA / DAY` | |
| 4 | `formato` | `FORMATO` | Badge de color: Reel=navy · Carrusel=navy medio |
| 5 | `titulo` | `TÍTULO / CONCEPT` | |
| 6 | `caption_es` o `caption_post` | `🇪🇸 CAPTION ESPAÑOL (PAS)` | Fondo crema cálida `#FFFAF0` |
| 7 | `caption_en` | `🇺🇸 CAPTION ENGLISH (PAS)` | Fondo azul suave `#F0F4FF` — vacío si cliente monolingüe |
| 8 | `hook` o `hook_primer_frame` | `🪝 HOOK ES · EN` | Fondo rosado · texto rojo oscuro |
| 9 | `material` | `📁 MATERIAL` | Fondo azul info suave |
| 10 | `script_es` | `📽️ ON-SCREEN SCRIPT ES` | Fondo casi negro `#0D1117` · texto blanco |
| 11 | `script_en` | `📽️ ON-SCREEN SCRIPT EN` | Fondo navy `#0F1A2E` · texto blanco |
| 12 | `cta_es` / `cta` + `cta_en` | `📣 CTA ES · EN` | Fondo rojo oscuro · texto blanco |
| 13 | `hashtags` | `#️⃣ HASHTAGS` | |
| 14 | `objetivo` | `🎯 OBJETIVO` | Fondo navy · texto blanco |
| 15 | `estado` | `STATUS` | Verde = Publicado · Azul = Aprobado |

### Campos bilingües del schema (para clientes con F2 = bilingüe)

Además de los campos base, usar estos campos extra en el JSON de piezas:
- `caption_en` — Caption en inglés siguiendo el mismo framework PAS
- `script_en` — On-screen script EN frame a frame (solo Reels bilingües)
- `cta_en` — CTA en inglés (ej: "DM 'BOOK' to reserve your experience")
- `hook_en` — Hook en inglés (opcional — puede ir dentro de `hook` con emoji de bandera)

Para Reels, el `script_es` debe seguir el formato frame a frame del ejemplo:
```
── REEL #N · [TÍTULO EN CAPS] · ~XX seg ──
🇪🇸 ESPAÑOL

[F1 · 0–2s]
VISUAL: [descripción visual]
TEXTO: "[hook ≤7 palabras]"
POSICIÓN: [top/bottom/center]

[F2 · 2–5s]
VISUAL: [descripción]
TEXTO: "[texto overlay]"
```

Para Carruseles, `script_es` debe ser:
```
— CARRUSEL · No aplica on-screen script —

GUÍA DE SLIDES:
S1 [Gancho]: "[texto principal]" · "[texto apoyo]"
S2 [Desarrollo]: ...
SN [CTA]: ...
```

---

## 7. Anti-Patrones — Qué NUNCA Hacer

| ❌ Anti-patrón | ✅ Corrección |
|----------------|--------------|
| Crear contenido sin leer identity.md | Siempre leer identity primero, sin excepción |
| Crear contenido sin leer _historial.md | Siempre leer historial para evitar repetir ángulos |
| Repetir ángulos sin diversificar | Revisar tabla de ángulos en _historial.md antes de generar |
| Usar tono homogéneo en toda una parrilla | Variar entre ejecutivo, aspiracional, educativo, etc. |
| Entregar score < 9.0 sin avisar | Reportar score y ofrecer mejora antes de entregar |
| Usar `new Set()` en código n8n | Usar `.filter()` con `.indexOf()` |
| Escapar comillas en expresiones n8n | `{{ $json["Campo"] }}` — sin escapes, sin backticks |
| Inventar datos del cliente que no están en identity | Dejar `[POR DEFINIR]` y avisarle a Ivan |
| Crear archivos fuera de la estructura sin confirmación | Preguntar a Ivan si el destino no está mapeado |
| Usar hashtags prohibidos del cliente | Verificar sección 6 del identity antes de incluir hashtags |
| Responder en inglés sin razón de negocio | Todo en español salvo outputs de cliente que lo requieran |
| Meter el copy de los slides dentro del caption_post | Separar siempre: `caption_post` = texto del post de Instagram (≤60 palabras). `copy_slides` = brief para el diseñador, solo en carruseles |
| Captions de 150+ palabras con listas y párrafos | Los captions largos no son copy publicable — confunden al community manager. Respetar límites por formato |
| Carrusel sin campo copy_slides | Todo carrusel DEBE tener `copy_slides` — sin él no hay brief para el diseñador y la pieza no se puede producir |

---

## 9. Schema JSON de Cadenas de Stories

### Flujo de preguntas obligatorio antes de generar

Cuando Ivan use el comando `"Genera cadena de stories para [cliente] sobre [tema]"`, preguntar exactamente estos campos en una sola pregunta estructurada (no preguntar lo que ya está en `identity.md`):

```
Para crear la cadena de stories de [cliente] necesito:

1. OBJETIVO de esta cadena:
   [ ] Awareness — dar a conocer algo nuevo
   [ ] Engagement — generar interacción (votos, respuestas, preguntas)
   [ ] Conversión — llevar a DM, link o acción concreta
   [ ] Behind the scenes — mostrar proceso/equipo/día a día
   [ ] Teaser — anticipar un lanzamiento o anuncio
   [ ] Educativa — enseñar algo en pasos

2. TIPO de cadena narrativa:
   [ ] Historia con inicio-nudo-desenlace
   [ ] Lista o pasos secuenciales
   [ ] Pregunta → revelación progresiva
   [ ] Antes / Después
   [ ] Solo informativa (slides independientes)

3. NÚMERO de slides: [3 / 5 / 7 / otro: ___]

4. ELEMENTO INTERACTIVO (uno por cadena, en el slide que más convenga):
   [ ] Poll (2 opciones)
   [ ] Pregunta abierta (sticker pregunta)
   [ ] Slider de emoji
   [ ] Countdown (si hay fecha de evento)
   [ ] Quiz (respuesta correcta)
   [ ] Ninguno

5. CTA FINAL (último slide):
   [ ] DM con keyword → keyword: ___
   [ ] "Link en bio" → describir destino: ___
   [ ] Guardar esta historia
   [ ] Responde con [emoji]
   [ ] Solo continuar viendo el perfil

6. MATERIAL VISUAL disponible:
   [ ] Fotos propias → describir brevemente: ___
   [ ] Videos propios → describir brevemente: ___
   [ ] Solo diseño gráfico (sin fotos/video reales)
   [ ] Mezcla → detallar: ___
```

> Si Ivan no responde algún campo, usar el valor por defecto indicado en el schema.

---

### Schema JSON — Cadena de Stories

El output debe ser un archivo `.json` guardado en `clientes/{slug}/01-contenido/stories/` con este schema exacto:

```json
{
  "meta": {
    "cliente": "slug-del-cliente",
    "slug": "slug-del-cliente",
    "tema": "Nombre descriptivo del tema de la cadena",
    "objetivo": "Awareness | Engagement | Conversión | Behind the scenes | Teaser | Educativa",
    "tipo_cadena": "Historia | Lista-pasos | Pregunta-revelación | Antes-Después | Informativa",
    "total_slides": 5,
    "elemento_interactivo": "Poll | Pregunta abierta | Slider | Countdown | Quiz | Ninguno",
    "cta_final": "DM 'KEYWORD' | Link en bio | Guardar | Responde con emoji | Continuar perfil",
    "generado": "YYYY-MM-DD"
  },
  "slides": [
    {
      "numero": 1,
      "rol": "Gancho",
      "texto_overlay": "Texto principal sobre el visual (máx 7 palabras, fuente grande)",
      "copy_apoyo": "Texto secundario o sticker adicional (máx 12 palabras, puede estar vacío)",
      "visual": "Descripción del fondo / material visual requerido para este slide",
      "elemento_interactivo": "Ninguno | Poll: '¿Opción A o B?' | Pregunta: '¿Texto?' | Slider | Countdown: fecha",
      "duracion_sugerida": "Foto 7s | Video clip Xs | GIF",
      "notas_diseño": "Instrucciones específicas para el diseñador: colores, posición de texto, overlay de color, etc."
    }
  ],
  "specs_produccion": {
    "formato": "9:16 · 1080×1920px",
    "duracion_total_estimada": "X slides = aprox. Xs de visualización",
    "paleta_aplicada": "Colores de marca usados (del identity)",
    "material_requerido": ["asset 1 — descripción", "asset 2 — descripción"],
    "herramientas_sugeridas": "Canva | CapCut | Adobe Express"
  },
  "auto_qa": "[X/Y] slides aprobados · [ítems fallidos o 'todos aprobados'] · QA Técnico: aprobado"
}
```

### Roles de slides válidos

| Rol | Descripción | Posición típica |
|-----|-------------|-----------------|
| `Gancho` | Detiene el skip en el primer instante. Pregunta, afirmación fuerte o visual impactante | Slide 1 siempre |
| `Desarrollo` | Construye la historia o el argumento slide a slide | Slides 2, 3, 4 |
| `Clímax` | Punto de mayor tensión, dato sorpresivo o revelación | Penúltimo o central |
| `Interactivo` | Slide con elemento de participación (poll, pregunta, quiz) | Slide 2–4 |
| `CTA` | Cierre con acción clara y directa | Último slide siempre |

### Reglas de calidad obligatorias — Stories (RS)

**RS1 — Gancho en slide 1**
El `texto_overlay` del slide 1 debe generar tensión, curiosidad o urgencia en ≤ 7 palabras. PROHIBIDO empezar con "Hoy te contamos", "Descubre", "Conoce" — son débiles. Usar pregunta directa, dato impactante o afirmación contraintuitiva.

**RS2 — Continuidad narrativa**
Cada slide debe "jalar" al siguiente. El `copy_apoyo` del slide N puede terminar en "..." o en pregunta implícita que se resuelve en N+1. PROHIBIDO que los slides sean independientes si el tipo es Historia o Pregunta-revelación.

**RS3 — Un elemento interactivo por cadena**
No más de un sticker interactivo por cadena. Va en el slide de mayor engagement potencial (normalmente slide 2 o 3), nunca en el slide 1 (mata la narrativa) ni en el CTA final (compite con la acción).

**RS4 — CTA final concreto**
El último slide tiene UN solo CTA. PROHIBIDO incluir dos acciones en el mismo slide ("guarda esto Y mándanos DM"). Elegir la de mayor prioridad según el objetivo de la cadena.

**RS5 — Texto overlay legible en móvil**
`texto_overlay` máx 7 palabras en fuente grande (≥ 36pt equivalente). `copy_apoyo` máx 12 palabras en fuente secundaria. PROHIBIDO párrafos de texto en stories — si hay más info, dividirla en más slides.

**RS6 — Auto-QA obligatorio**
El campo `auto_qa` debe validar: gancho fuerte en slide 1 · continuidad entre slides · máx 1 interactivo · CTA único en slide final · texto dentro de límites · coherencia visual con identity del cliente.

**RS7 — Coherencia visual-narrativa (gancho)**
El visual del Slide 1 NUNCA puede mostrar el resultado final si el tipo de cadena es Antes/Después o Transformación.
Mostrar el resultado en el gancho elimina la razón para ver el resto de la cadena.
Opciones válidas para el Slide 1: fondo negro con tipografía sola, boceto/plano, detalle abstracto, imagen de proceso o "estado antes".
Esta regla aplica para cualquier tipo narrativo donde exista un "antes" implícito o explícito.

**RS8 — Calidad estratégica del elemento interactivo**
Las encuestas y stickers deben capturar INTENCIÓN DE COMPRA o ETAPA DEL CLIENTE, no opiniones técnicas ni disyuntivas entre los propios diferenciales del cliente.
PROHIBIDO: encuestas que enfrenten los atributos del cliente entre sí (ej. "¿diseño o ejecución?") — generan disonancia de marca.
CORRECTO: preguntas que segmentan leads → "¿En qué etapa estás?" · "¿Tienes proyecto en mente?" · "¿Estás listo para cotizar?"
Criterio de aprobación: ¿la respuesta del usuario nos dice algo accionable para ventas?

**RS9-B — Credibilidad temporal en el slide de cierre (aplica a todos los clientes)**
El Slide CTA debe incluir SIEMPRE dos datos de credibilidad, no uno:
1. **Cumplimiento de alcance**: qué se entregó — se extrae del campo DIFERENCIADOR del identity del cliente activo
2. **Cumplimiento de tiempo**: en cuántas semanas o que se entregó en el plazo acordado

Regla de extracción automática del dato de tiempo:
- Si el cliente proporcionó el tiempo real en los inputs o en el campo Material disponible → usar la cifra exacta: "Entregado en [X] semanas."
- Si no se proporcionó el dato → usar la forma genérica: "Entregado en el plazo acordado."
- PROHIBIDO omitir la línea de tiempo en cualquier cadena, para cualquier cliente, sin excepción.

Formato universal del dato de credibilidad en el CTA:
`[Diferenciador de alcance del cliente] · [Dato de tiempo] · [CTA principal]`

Ejemplos por tipo de cliente:
- Arquitectura/construcción: "Diseño, licencias y obra. Entregado en 12 semanas. Escríbenos KEYWORD."
- Transporte premium: "Reserva, traslado y seguimiento en tiempo real. En tu destino a tiempo, siempre. Escríbenos KEYWORD."
- Servicio local: "Diagnóstico, ejecución y garantía. Resuelto en [X] días. Escríbenos KEYWORD."

Si ningún dato de alcance ni de tiempo está disponible, usar: "Entregado en el plazo acordado. Sin sorpresas."

### Voz — Identidad Urbex (aplica a copy de apoyo en toda cadena Urbex)
- Primera persona del plural activa: "materializamos", "entregamos", "diseñamos", "ejecutamos"
- PROHIBIDO: lenguaje emocional vacío ("tus sueños", "hazlo realidad", "tu hogar ideal", "espacio perfecto")
- El tono demuestra capacidad técnica — vende certeza, no emoción

### Scoring interno — Stories
El score 10/10 solo es alcanzable si RS1–RS9 están todas aprobadas.
Penalizaciones automáticas acumulables:
- RS7 fallida: −0.5
- RS8 fallida: −0.3
- RS9 solo alcance (sin dato de tiempo): ⚠️ Aprobado parcial → −0.2
- RS9 sin ningún dato (ausente): ❌ Reprobado → −0.3
- RS1–RS6 fallidas mantienen sus propias penalizaciones (−0.2 por cada una)
Score mínimo aceptable para entrega: 9.0/10. Bajo ese umbral se informa a Ivan con detalle de fallas.

### Reglas de idioma para stories
- Mismo criterio que parrillas: español de Colombia por defecto
- Draken VIP: inglés americano si el contexto es mercado USA
- El tono de `texto_overlay` debe ser más directo e informal que el copy de feed — las stories son conversacionales
