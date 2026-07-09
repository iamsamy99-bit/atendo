# Admin Dashboard (CRM) — atendo.lat/admin-dashboard/

Panel de administración para leads, clientes, pagos y tickets. Sin IA: todo es
manual + automatizaciones vía API. Creado 2026-07-08.

## Acceso

- URL: `https://atendo.lat/admin-dashboard/`
- Login: contraseña única de superadmin. Está en `.env.local` → `ADMIN_DASHBOARD_PASSWORD` (nunca en git).
- La sesión dura 30 días (cookie HttpOnly). "Cerrar sesión" la revoca en el servidor.

## Arquitectura

- **Frontend**: SPA React en `admin/` → build a `dist/admin-dashboard/` (hash routing: `#/leads`, `#/clientes`, `#/pagos`, `#/tickets`).
- **API**: Cloudflare Pages Functions en `functions/api/*` (mismo deploy que la landing).
- **BD**: Cloudflare D1 `atendo-crm` (id `6826303d-7566-4760-9905-be8cb76ca9c8`), binding `DB` en `wrangler.toml`. Esquema en `db/schema.sql`.
- **Auth**: hash PBKDF2 de la contraseña en la tabla `config` (clave `password_hash`); sesiones en tabla `sesiones`.

## Módulos

- **Inicio**: ingresos del mes, clientes activos, leads en pipeline, tickets abiertos, ingresos por mes.
- **Leads**: kanban con los estados de `docs/lead-flow.md` (nuevo → contactado → calificado → demo_agendada → propuesta_enviada → ganado/perdido). Un lead "ganado" se convierte en cliente con un clic.
- **Clientes**: ficha con plan, mensualidad y estado (activo/pausado/cancelado).
- **Pagos**: registro manual por cliente con totales del mes e histórico.
- **Tickets**: abierto/en curso/resuelto con prioridad.

## Integración con Make (leads automáticos)

Endpoint público protegido por clave (NO requiere sesión):

```
POST https://atendo.lat/api/ingest-lead
Headers:
  content-type: application/json
  x-atendo-key: <CRM_INGEST_KEY de .env.local>
Body (solo `nombre` es obligatorio):
  {
    "nombre": "Juan Pérez",
    "canal": "telefono",          // calendly|telefono|whatsapp|crisp|pricing|referido|otro
    "telefono": "+52...",
    "email": "...",
    "empresa": "...", "industria": "...",
    "necesidad": "...", "volumen_estimado": "...",
    "plan_interes": "...", "idioma": "es",
    "origen": "vapi-sofia", "notas": "..."
  }
```

Para conectar Sofía: en el escenario de Make 5412610, en la ruta (1)
`end-of-call-report`, agregar un módulo HTTP "Make a request" con ese POST,
mapeando los campos del `captureLeadInfo`. Así cada llamada crea el lead en el
CRM además del email + Telegram actuales.

## Operación

- **Deploy**: `npm run build && npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true` (igual que siempre; funciones y SPA van incluidas).
- **Cambiar contraseña**: generar hash nuevo (PBKDF2-SHA256, formato `pbkdf2$iter$saltB64$hashB64`) y
  `npx wrangler d1 execute atendo-crm --remote --command "UPDATE config SET valor='<hash>' WHERE clave='password_hash'"`.
  Para cerrar todas las sesiones: `DELETE FROM sesiones`.
- **Rotar clave de ingesta**: `UPDATE config SET valor='<nueva>' WHERE clave='ingest_key'` (y actualizarla en Make).
- **BD local para desarrollo**: `npx wrangler d1 execute atendo-crm --local --file db/schema.sql` y luego `npx wrangler pages dev dist`.

## Webhook directo de Vapi (Sofía) — 2026-07-09

El `server.url` del assistant de Vapi ya NO apunta a Make sino a
`https://atendo.lat/api/vapi-webhook` (functions/api/vapi-webhook.ts), autenticado
con el header `x-vapi-secret` (config.vapi_secret en D1; copia en `.env.local`
→ `VAPI_WEBHOOK_SECRET`).

Flujo: `end-of-call-report` → guarda/actualiza el lead en D1 (idempotente por
`origen = vapi:<callId>`, COALESCE para no pisar datos) y reenvía el payload a
Make (`config.make_forward_url`) para Telegram/email. Los `tool-calls`
(consultarDisponibilidad, captureLeadInfo, agendarDemo) se proxean a Make de
forma síncrona, devolviendo su respuesta a Vapi — los horarios y el "LEAD EN
VIVO" siguen funcionando igual.

Si Make falla o se cancela, el CRM sigue recibiendo los leads: solo se pierde
la notificación de Telegram/email hasta reconfigurar `make_forward_url`.
