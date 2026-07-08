# Atendo Landing — Pendientes

## Deploy
- [x] **Dominio propio: atendo.lat** (comprado 05-jul-2026 en Porkbun, ~$1.54 USD año 1 / ~$26 renovación; auto-renew + WHOIS privacy ON; API keys en `.env.local`). NS → Cloudflare (carl/dayana), zona en la cuenta, custom domains atendo.lat + www conectados al proyecto Pages vía API. Canonical/OG/sitemap ya apuntan a https://atendo.lat. Crisp acepta el origen (203). ✅ DNS completo (08-jul-2026): se borraron 2 registros A viejos de Surge en el @ y se creó CNAME @→atendo-9a5.pages.dev proxied (token DNS en .env.local CLOUDFLARE_DNS_TOKEN); atendo.lat y www sirven landing + /admin-dashboard. (2) verificar chat en vivo cuando active; (3) actualizar dominio en el dashboard de Crisp.
- [!] **Crisp bloquea `*.pages.dev` y `*.workers.dev`** (WebSocket relay responde HTTP 451 por Origin; verificado 02-jul-2026 con curl). El chat nunca funcionará en atendo-9a5.pages.dev; en atendo.lat y atendo.surge.sh sí. El CTA "abre el chat" tiene fallback a WhatsApp si Crisp no conecta.
- [x] **Cloudflare Pages** — en vivo en https://atendo-9a5.pages.dev (proyecto `atendo`, cuenta iamsamy99@gmail.com). Redeploy: `npm run build && npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true`. Ver docs/deploy-cloudflare.md
- [x] **Deploy a Surge.sh** — https://atendo.surge.sh (host principal TEMPORAL: el chat Crisp funciona ahí). Redeploy: `npm run build && npx surge dist atendo.surge.sh`
- [~] **Netlify** — descartado (sin créditos). netlify.toml se conserva por si acaso.

## Urgente
- [ ] **Rotar la API key de OpenAI** — fue expuesta en una sesión anterior. Generar una nueva en platform.openai.com/api-keys
- [x] **Higiene de secretos en repo** — `.env.local` está en `.gitignore`; `.env.example` sólo debe contener placeholders. No documentar claves reales.

## Correo de empresa
- [x] **Cloudflare Email Routing activo** (05-jul-2026, gratis) — `hola@atendo.lat`, `samuel@atendo.lat` y catch-all (cualquier-cosa@atendo.lat) se reenvían a `sg8258563@gmail.com` (destino verificado). MX+SPF creados automáticamente en la zona. Administrar en: dash.cloudflare.com → atendo.lat → Email → Email Routing.
- [ ] **"Enviar como" hola@atendo.lat desde Gmail** — configurar en Gmail de sg8258563: Configuración → Cuentas → "Enviar como" → smtp.gmail.com:587, usuario sg8258563@gmail.com + contraseña de aplicación. La app password quedó validada por SMTP; conviene generar una nueva para esto y revocar la que se compartió por chat.

## Integraciones
- [x] **Crisp chat** — integrado con módulo que sincroniza idioma ES/EN automáticamente
- [x] **Vapi — Sofía creada** — Assistant ID: `f861274a-c871-4ac5-8f5c-d3d5cb97c947`, voz Azure es-MX-DaliaNeural
- [x] **Vapi — conectar número de teléfono** — dos números asignados a Sofía: `+16692680598` (provider vapi, el principal, en .env.local) y `+19569061491` (Twilio, ex "Twilio Number WA" — confirmar si era para WhatsApp)
- [x] **Vapi — serverUrl** — conectado a `hook.us2.make.com/jo3cjsr…` (server.timeoutSeconds 20)
- [x] **Make.com — escenario con Router** — plan Free = máx 2 escenarios, así que se usa UN escenario (`Vapi Sofía — Lead al cerrar llamada`, id 5412610) con Router de 3 rutas: (1) `end-of-call-report`→email+Telegram, (2) `tool-calls` async→alerta Telegram en vivo, (3) `consultarDisponibilidad`→Webhook Response con horarios. Vapi manda `serverMessages: [end-of-call-report, tool-calls]`. (2026-06-30)
- [x] **Probar tool-calls en vivo** — llamada 01:23 (01-jul) disparó `captureLeadInfo` + `agendarDemo` con args correctos; Make ejecutó ambas por el Router sin error (status SUCCESS, 5 ops). Falta que Samuel confirme visualmente que el Telegram "LEAD EN VIVO" renderizó los campos (no vacíos). Si salen vacíos, revisar `toolCallList[1]` vs `toolCalls[1].function`.
- [x] **Voz más humana** — cambiada a ElevenLabs `eleven_turbo_v2_5` voz Sarah (EXAVITQu4vr4xnSDxMaL) con fallbackPlan a Azure Dalia. (01-jul)
- [x] **Precios en el prompt** — sección [Precios] con montos reales; prohibido evadir/decir "X pesos". (01-jul)
- [x] **Fix despedida/colgado** — prompt [Cierre]: pregunta "¿algo más?", una sola despedida con "Hasta luego" + endCall; endCallPhrases=['hasta luego','hasta pronto']. Anti-interrupción: waitSeconds 1.2 + smartEndpointing vapi. (01-jul)
- [ ] **consultarDisponibilidad = horarios estáticos** — hoy responde texto fijo (mar/jue 10-2, mié tarde). Para horarios reales conectar Calendly en Make. Ver docs/make-vapi-integration.md.
  - [!] **Bug encontrado (03-jul-2026)**: el availability schedule real en Calendly del event type "30 Minute Meeting" no coincide con ese texto — hoy dice domingo abierto 24h y lunes-viernes solo 16:45-17:00 (15 min). Antes de conectar, Samuel debe confirmar el horario real que quiere ofrecer.
  - [ ] Autorizar conexión Calendly↔Make: link pendiente en `https://us2.make.com/2454147/credentials-requests/inbox?requestId=19527b72-2cb4-401e-b9ea-e4acf52e86cd` (app Calendly, módulo Make an API Call, para el escenario 5412610).
- [ ] **WhatsApp en vivo (agendarDemo)** — enviar link de Calendly al cliente durante la llamada requiere Twilio WhatsApp sender aprobado. Por ahora solo alerta a Samuel por Telegram.
- [x] **Vapi — agregar 3 funciones a Sofía** — captureLeadInfo, agendarDemo, consultarDisponibilidad añadidas vía API + instrucciones en el system prompt (2026-06-30)
- [x] **Vapi — fix cuelgues raros** — los `endCallPhrases` incluían frases de cortesía ('que tengas buen día', 'nos vemos', 'adiós') que colgaban la llamada cuando Sofía las decía. Reducidos a despedidas explícitas del cliente; para colgar usa el tool `endCall` (2026-06-30)
- [ ] **Telnyx — número MX** — comprar número lada 55/33 y conectarlo a Vapi. API key ya guardada en `.env.local` (TELNYX_API_KEY). Pasos en docs/telnyx-mexico-number.md. Alternativa: ya hay cuenta de Twilio, se podría portar/comprar el MX ahí.
- [x] **Calendly** — verificado en producción (02-jul-2026, headless Chrome sobre atendo.surge.sh): el iframe embebido renderiza el calendario con disponibilidad real, sin errores de consola. Nota: el idioma del widget lo decide el navegador del visitante (Calendly no acepta param de locale).
- [~] **ElevenLabs `VITE_ELEVENLABS_AGENT_ID`** — obsoleto: el widget convai se eliminó en c87c373; el CTA de voz ahora es `tel:+16692680598` directo a Sofía (Vapi). La var puede borrarse de `.env.local`/`.env.example` cuando se haga limpieza.

## Mejoras futuras
- [x] **SEO base** — meta tags Open Graph, Twitter card, sitemap.xml, robots.txt y JSON-LD agregados para el dominio actual de Cloudflare Pages
- [ ] **Analytics** — conectar Google Analytics o Plausible
- [ ] **Testimonios** — agregar sección con casos reales cuando haya clientes
- [ ] **Blog / contenido** — artículos para SEO local (México, EE.UU.)
- [x] **Captura alternativa** — respaldo por WhatsApp prellenado y Crisp cuando Calendly no carga
- [x] **Flujo minimo de lead** — documentado en `docs/lead-flow.md`

## CRM / Admin dashboard (2026-07-08)
- [x] **Dashboard construido y probado en local** — SPA React en `/admin-dashboard` + API Pages Functions + D1 `atendo-crm` (remota ya con esquema y credenciales). Módulos: inicio con métricas, leads (kanban lead-flow.md), clientes, pagos, tickets. Docs: docs/admin-dashboard.md. Contraseña e ingest key en `.env.local`.
- [x] **Deploy a producción hecho (08-jul-2026)** — CRM en vivo en https://atendo.lat/admin-dashboard/ (y www).
- [ ] **Conectar Make → /api/ingest-lead** — agregar módulo HTTP en la ruta end-of-call-report del escenario 5412610 (ver docs/admin-dashboard.md).
