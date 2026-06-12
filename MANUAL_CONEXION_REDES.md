# MANUAL DE CONEXIÓN DE REDES SOCIALES — TimeKeepers AI

> Cómo conectar Instagram, Facebook y TikTok de cada cliente al dashboard (Tab **📲 Redes**) para hacer seguimiento diario de métricas.
> Generado: 2026-06-09 · Aplica a la pestaña Redes del dashboard.

---

## 0. LO PRIMERO — Por qué NO se usa usuario y contraseña

**Ninguna de las tres plataformas permite conectarse con el usuario y la contraseña de la cuenta.** Hacerlo:

- Viola los Términos de Servicio de Meta y TikTok.
- Puede inhabilitar o suspender la cuenta del cliente.
- Es un riesgo de seguridad grave (si filtras una contraseña, comprometes toda la cuenta).

La forma **oficial y segura** es un **token de acceso (access token)**: una credencial larga que generas **una sola vez** en el portal de desarrollador de cada plataforma y que pegas en el dashboard. El token solo da permiso de **lectura de métricas** — nunca expone la contraseña ni permite publicar sin autorización.

| Plataforma | Qué necesitas | Dónde se genera | Caduca |
|---|---|---|---|
| Instagram | Instagram Business Account ID + Access Token | Meta for Developers | 60 días (token largo) |
| Facebook | Page ID + Page Access Token | Meta for Developers | 60 días (renovable a permanente) |
| TikTok | Open ID + Access Token | TikTok for Developers | Variable (refresh token) |

---

## 1. INSTAGRAM — Paso a paso

> **Requisito previo:** la cuenta del cliente debe ser **Business** o **Creator** (no personal) y estar **vinculada a una Página de Facebook**. Esto se hace desde la app de Instagram → Configuración → Cuenta → Cambiar a cuenta profesional.

### 1.1 Crear la app de Meta
1. Entra a **https://developers.facebook.com/** e inicia sesión con tu Facebook.
2. **Mis Apps → Crear App → caso de uso "Business"**. Ponle un nombre (ej: `TimeKeepers-Analytics`).
3. Anota el **App ID** y el **App Secret** (Configuración → Básica).

### 1.2 Vincular Instagram y obtener permisos
4. En el panel de la app, agrega el producto **"Instagram Graph API"**.
5. Ve al **Graph API Explorer** (https://developers.facebook.com/tools/explorer/).
6. Selecciona tu app y solicita estos permisos (Add Permissions):
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
7. Pulsa **Generate Access Token** y acepta los diálogos. Esto te da un **token corto (1 hora)**.

### 1.3 Encontrar el Instagram Business Account ID
8. En el Graph API Explorer, ejecuta:
   ```
   GET /me/accounts
   ```
   → copia el `id` de la Página de Facebook del cliente.
9. Ejecuta (reemplaza `{page-id}`):
   ```
   GET /{page-id}?fields=instagram_business_account
   ```
   → el `instagram_business_account.id` es tu **Instagram Business Account ID**. Anótalo.

### 1.4 Convertir el token corto en token largo (60 días)
10. Ejecuta en el navegador (reemplaza valores):
    ```
    https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN_CORTO}
    ```
    → la respuesta trae el **token largo** (campo `access_token`). Ese es el que pegas en el dashboard.

### 1.5 Pegar en el dashboard
11. Dashboard → Tab **📲 Redes** → tarjeta **Instagram**:
    - **Usuario (@handle):** `@elhandledelcliente`
    - **Instagram Business Account ID:** el del paso 9
    - **Access Token:** el token largo del paso 10
12. **💾 Guardar** → **🔌 Probar conexión**. Si todo está bien verás seguidores y nº de publicaciones.

> ⏰ **El token largo dura 60 días.** Pon un recordatorio para regenerarlo. Se puede refrescar después de 24h sin volver a hacer todo el flujo.

---

## 2. FACEBOOK — Paso a paso

> **Requisito previo:** la Página debe tener **100 o más "Me gusta"** para que Facebook entregue insights.

1. Usa la **misma app** de Meta del paso 1.1 (no necesitas crear otra).
2. En el **Graph API Explorer**, solicita permisos:
   - `pages_show_list`
   - `pages_read_engagement`
   - `read_insights`
3. Obtén el **Page ID**: ejecuta `GET /me/accounts` → copia el `id` y el `access_token` **de esa página** (ese ya es un **Page Access Token**).
4. Conviértelo en token largo con el mismo procedimiento del paso 1.4 (intercambio `fb_exchange_token`). Un Page Token intercambiado a largo puede volverse **permanente**.
5. Dashboard → Tab **📲 Redes** → tarjeta **Facebook**:
   - **Nombre de la Página**, **Page ID**, **Page Access Token**.
6. **💾 Guardar → 🔌 Probar conexión** → verás el nombre de la página y los seguidores.

> ⚠️ **Aviso Meta:** varias métricas de Page Insights se descontinúan el **15 de junio de 2026**. Si una métrica deja de responder, revisa la documentación de Graph API v23+ para su reemplazo.

---

## 3. TIKTOK — Paso a paso

> TikTok es más restrictivo: requiere **aprobación de tu app** por parte de su equipo, y la consulta de datos **no se puede hacer desde el navegador** (bloqueo CORS) — necesita pasar por el servidor.

1. Entra a **https://developers.tiktok.com/** e inicia sesión.
2. **Manage Apps → Create an App.** Completa la información que pidan (descripción del uso: analítica de cuentas propias/gestionadas).
3. Agrega los productos:
   - **Login Kit** (autenticación OAuth)
   - **Display API** (datos de perfil y videos) — o **TikTok API for Business** si el cliente tiene cuenta Business.
4. Solicita los **scopes**: `user.info.basic`, `user.info.stats`, `video.list`.
5. Configura el **Redirect URI** (ej: `http://localhost:3737/tiktok/callback`).
6. Anota **Client Key** y **Client Secret**.
7. Haz el flujo OAuth para obtener el **Access Token** y el **Open ID** del cliente.
8. Dashboard → Tab **📲 Redes** → tarjeta **TikTok**: pega **@handle**, **Open ID** y **Access Token**, y **💾 Guardar**.

### Por qué TikTok no tiene "Probar conexión" en vivo (todavía)
El navegador no puede llamar directo a `open.tiktokapis.com` (política CORS). Hay que crear un **endpoint proxy en el servidor**:

```
GET /api/redes/tiktok/:slug  →  el servidor lee el token guardado,
                                 llama a open.tiktokapis.com/v2/user/info/,
                                 y devuelve los datos al dashboard.
```

Mientras ese endpoint no exista, registra las métricas de TikTok **manualmente** en la tabla de Seguimiento diario. (Ver PENDIENTES.md → "Proxy TikTok".)

---

## 4. QUÉ DATOS SE PUEDEN EXTRAER (analítica disponible)

| Métrica | Instagram | Facebook | TikTok |
|---|:---:|:---:|:---:|
| Seguidores / fans | ✅ | ✅ | ✅ |
| Crecimiento de seguidores (diario) | ✅ | ✅ | ✅ |
| Alcance (reach) | ✅ | ✅ | ✅ (views) |
| Impresiones | ✅ | ✅ | ✅ |
| Visitas al perfil | ✅ | ✅ | ✅ |
| Interacciones (likes, comentarios, guardados, compartidos) | ✅ | ✅ | ✅ |
| Engagement rate | ✅ (calculado) | ✅ (calculado) | ✅ (calculado) |
| Rendimiento por publicación / video | ✅ | ✅ | ✅ |
| Clics en el enlace de la bio / web | ✅ | ✅ | parcial |
| Demografía de audiencia (edad, género, ciudad) | ✅ | ✅ | ✅ |
| Mejores horas de actividad | ✅ | parcial | ✅ |

> El **engagement %** lo calcula el dashboard solo: `(interacciones ÷ alcance) × 100`.

---

## 5. MCPs y herramientas de referencia (2026)

Servidores MCP (Model Context Protocol) que conectan IA con estas APIs, por si más adelante automatizas la extracción desde Claude:

- **meta-mcp** (`mikusnuz/meta-mcp`) — 57 herramientas para Instagram Graph API v25, Threads y Meta. GitHub.
- **ig-mcp** (`jlbadano/ig-mcp`) — MCP de Instagram Business, listo para producción.
- **instagram-analytics-mcp** (`BilalTariq01/...`) — enfocado en analítica vía Meta Graph API.
- **meta-ads-mcp** (`pipeboard-co/meta-ads-mcp`) — gestión de Meta Ads (Facebook + Instagram).
- **just_facebook_mcp** (`Livia-Zaharia/...`) — MCP solo de Facebook.

> A mediados de 2026 el ecosistema de MCPs sociales todavía es pequeño y la mayoría son de un solo desarrollador. Para producción seria conviene la API oficial directa (lo que ya hace el dashboard) o un proveedor agregador (Phyllo, etc.) si necesitas muchas cuentas.

---

## 6. SEGURIDAD — Dónde quedan guardadas las credenciales

- **Hoy (MVP):** los tokens se guardan en el `localStorage` del navegador de tu máquina, separados por cliente. Como el dashboard es 100% local y de un solo operador, es aceptable para empezar.
- **Recomendado para producción:** mover el almacenamiento al servidor en un archivo cifrado por cliente (ej: `clientes/{slug}/redes.secret.json`) con cifrado AES, y que el navegador nunca vea el token crudo. Ver PENDIENTES.md → "Almacenamiento seguro de tokens".
- **Nunca** subas estos tokens a Git ni los pegues en chats. Trátalos como contraseñas.

---

## 7. CHECKLIST RÁPIDO POR CLIENTE

```
[ ] Cuenta de IG es Business/Creator y está vinculada a Página FB
[ ] App de Meta creada (App ID + Secret anotados)
[ ] Permisos solicitados en Graph API Explorer
[ ] Instagram Business Account ID obtenido
[ ] Token largo (60 días) generado y pegado → Probar conexión ✓
[ ] Page ID + Page Access Token de Facebook → Probar conexión ✓
[ ] App de TikTok creada y aprobada (si aplica)
[ ] Recordatorio puesto para renovar tokens antes de 60 días
[ ] Primer snapshot diario registrado en la tabla de seguimiento
```

---

*Referencias: Meta for Developers (Instagram Graph API, Pages API v23), TikTok for Developers (Login Kit, Display API, Research API). Estado verificado a junio 2026.*
