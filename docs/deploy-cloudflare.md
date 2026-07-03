# Despliegue en Cloudflare Pages

> Atendo está alojado en Cloudflare Pages. Esta es la guía para volver a desplegar.

---

## Datos del proyecto

- **Proyecto Pages:** `atendo`
- **URL en vivo:** https://atendo-9a5.pages.dev
- **Cuenta Cloudflare:** iamsamy99@gmail.com (Account ID: `5207b53fefb1c78265c4fbeb95f8ce1a`)
- **Rama de producción:** `main`
- **Carpeta publicada:** `dist/`

---

## Volver a desplegar (después de hacer cambios)

```bash
# 1. Construir el sitio
npm run build

# 2. Subir a Cloudflare Pages
npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true
```

Cada despliegue genera una URL única de previsualización (ej. `https://abc123.atendo-9a5.pages.dev`)
y actualiza la URL de producción `https://atendo-9a5.pages.dev`.

---

## Primera vez en una máquina nueva (autenticación)

```bash
npx wrangler login   # abre el navegador, aceptar permisos
```

La sesión queda guardada localmente. Alternativa sin navegador: exportar `CLOUDFLARE_API_TOKEN`
(crear en dash.cloudflare.com → My Profile → API Tokens → plantilla "Edit Cloudflare Pages").

---

## Configuración importante

### `wrangler.toml` (raíz del proyecto)
```toml
name = "atendo"
pages_build_output_dir = "dist"
compatibility_date = "2025-06-21"
```

### `public/_headers` — headers de seguridad y CSP
Se copia automáticamente a `dist/` en cada build. Contiene:
- **Permissions-Policy con `microphone=(self)`** — CRÍTICO: sin esto el widget de voz de ElevenLabs no puede usar el micrófono.
- **CSP** que permite: Calendly, Crisp (client/image/storage/relay), ElevenLabs (script + websockets), Google Fonts.
- Caché agresivo para `/assets/*` (hash en el nombre) y sin caché para HTML.

Si se agrega un nuevo servicio externo (analytics, otro chat, etc.), hay que añadir su dominio al CSP en `public/_headers` y volver a desplegar.

### Variables de entorno (build)
- `VITE_ELEVENLABS_AGENT_ID` está en `.env.local` y se inyecta en el build local.
  - Valor actual: `agent_9301kv9nqhqqfh4tbz27h10pjmcg`
  - Como el despliegue sube el `dist/` ya construido, NO hace falta configurar variables en el panel de Cloudflare.

---

## Dominio personalizado (pendiente, opcional)

Para usar un dominio propio (ej. `atendo.com` o `atendo.mx`) en lugar de `atendo-9a5.pages.dev`:

1. dash.cloudflare.com → Workers & Pages → **atendo** → Custom domains → **Set up a custom domain**
2. Escribir el dominio y seguir las instrucciones de DNS.
3. Si el dominio se compra/gestiona en Cloudflare, el SSL y DNS se configuran solos en minutos.

---

## URLs limpias

Cloudflare Pages sirve URLs sin extensión automáticamente:
- `/terminos.html` redirige (308) a `/terminos`
- `/privacidad.html` redirige (308) a `/privacidad`

Ambas formas funcionan; los enlaces internos pueden usar cualquiera.

---

## Migración desde Surge.sh / Netlify

- **Surge** (`atendo.surge.sh`): se puede dejar como respaldo o dar de baja. Ya no es la fuente principal.
- **Netlify**: el `netlify.toml` se conserva por si se reactiva, pero Cloudflare Pages es ahora el host oficial.
- El archivo `.netlify/` local puede borrarse sin problema.
