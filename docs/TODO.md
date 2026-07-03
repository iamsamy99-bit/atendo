# Atendo Landing — Pendientes

## Deploy
- [!] **Crisp bloquea `*.pages.dev` y `*.workers.dev`** (WebSocket relay responde HTTP 451 por Origin; verificado 02-jul-2026 con curl). El chat NUNCA funcionará en atendo-9a5.pages.dev. netlify.app, surge.sh y dominios propios SÍ están permitidos. Por eso **la URL principal temporal es https://atendo.surge.sh** (canonical/OG/sitemap apuntan ahí) hasta tener dominio propio. El CTA "abre el chat" tiene fallback a WhatsApp si Crisp no conecta.
- [ ] **Dominio personalizado** (AHORA PRIORITARIO por lo de Crisp) — comprar atendo.mx o similar y conectarlo en Cloudflare → Workers & Pages → atendo → Custom domains; luego regresar canonical/OG/sitemap al dominio propio.
- [x] **Cloudflare Pages** — en vivo en https://atendo-9a5.pages.dev (proyecto `atendo`, cuenta iamsamy99@gmail.com). Redeploy: `npm run build && npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true`. Ver docs/deploy-cloudflare.md
- [x] **Deploy a Surge.sh** — https://atendo.surge.sh (host principal TEMPORAL: el chat Crisp funciona ahí). Redeploy: `npm run build && npx surge dist atendo.surge.sh`
- [~] **Netlify** — descartado (sin créditos). netlify.toml se conserva por si acaso.

## Urgente
- [ ] **Rotar la API key de OpenAI** — fue expuesta en una sesión anterior. Generar una nueva en platform.openai.com/api-keys
- [x] **Higiene de secretos en repo** — `.env.local` está en `.gitignore`; `.env.example` sólo debe contener placeholders. No documentar claves reales.

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
- [ ] **WhatsApp en vivo (agendarDemo)** — enviar link de Calendly al cliente durante la llamada requiere Twilio WhatsApp sender aprobado. Por ahora solo alerta a Samuel por Telegram.
- [x] **Vapi — agregar 3 funciones a Sofía** — captureLeadInfo, agendarDemo, consultarDisponibilidad añadidas vía API + instrucciones en el system prompt (2026-06-30)
- [x] **Vapi — fix cuelgues raros** — los `endCallPhrases` incluían frases de cortesía ('que tengas buen día', 'nos vemos', 'adiós') que colgaban la llamada cuando Sofía las decía. Reducidos a despedidas explícitas del cliente; para colgar usa el tool `endCall` (2026-06-30)
- [ ] **Telnyx — número MX** — comprar número lada 55/33 y conectarlo a Vapi. API key ya guardada en `.env.local` (TELNYX_API_KEY). Pasos en docs/telnyx-mexico-number.md. Alternativa: ya hay cuenta de Twilio, se podría portar/comprar el MX ahí.
- [ ] **Calendly** — verificar que el widget carga correctamente en producción. Si falla, la landing muestra WhatsApp y Crisp como respaldo.
- [ ] **ElevenLabs** — confirmar que `VITE_ELEVENLABS_AGENT_ID` está seteada en el hosting → Environment variables

## Mejoras futuras
- [x] **SEO base** — meta tags Open Graph, Twitter card, sitemap.xml, robots.txt y JSON-LD agregados para el dominio actual de Cloudflare Pages
- [ ] **Analytics** — conectar Google Analytics o Plausible
- [ ] **Testimonios** — agregar sección con casos reales cuando haya clientes
- [ ] **Blog / contenido** — artículos para SEO local (México, EE.UU.)
- [x] **Captura alternativa** — respaldo por WhatsApp prellenado y Crisp cuando Calendly no carga
- [x] **Flujo minimo de lead** — documentado en `docs/lead-flow.md`
