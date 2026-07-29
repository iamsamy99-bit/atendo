# Plan: chatbot de Atendo en tu propio WhatsApp Business + Instagram

> A diferencia de `plan-integracion-cliente.md` (que es para dar de alta un
> cliente), esto es para que **Atendo atienda sus propios prospectos** en sus
> propias cuentas — y de paso, quede como plantilla clonable para el plan
> Empresa de un cliente (mismo stack: Meta Cloud API + Make.com + OpenAI,
> per `integraciones.md`).

Empiezas desde cero: sin Meta Business verificado, sin WhatsApp Business API,
sin nada conectado todavía. El camino completo:

```
Meta Business Suite (cuentas)
      ↓
Meta for Developers → App con productos WhatsApp + Instagram
      ↓
Make.com: Webhook (mensaje entra) → OpenAI (genera respuesta) → Enviar mensaje
      ↓
QA con mensajes reales → Activar en producción
```

---

## Fase 0 — Cuentas base (todo esto lo haces tú; son pasos de Meta que no se pueden automatizar)

- [ ] **Página de Facebook de Atendo.** Si no existe, créala en facebook.com/pages/create (nombre "Atendo", categoría "Consultoría de negocios" o similar). WhatsApp Business API e Instagram messaging se enlazan a través de una Página, no de tu perfil personal.
- [ ] **Meta Business Suite** (business.facebook.com) — crea/entra a tu cuenta de negocio y agrega esa Página.
- [ ] **Instagram profesional**: si tu cuenta de Instagram de Atendo todavía es personal, cámbiala a cuenta **profesional (Business)** desde la app de Instagram → Configuración → Cuenta → Cambiar a cuenta profesional. Luego enlázala a la Página de Facebook desde Meta Business Suite → Configuración → Cuentas → Instagram.
- [ ] **Meta for Developers** (developers.facebook.com/apps) — crea una App nueva, tipo "Business". Dentro de la App, agrega los productos:
  - **WhatsApp** (te da un número de prueba gratis para empezar a probar sin verificar nada todavía).
  - **Instagram Graph API** / **Messenger** (mensajería de Instagram va por la misma API que Messenger).
- [ ] **Número para WhatsApp Business API**: NO puede ser un número que ya tenga WhatsApp normal o WhatsApp Business App activo — tiene que "liberarse" o ser nuevo. Para arrancar, usa el **número de prueba que Meta te da gratis** dentro de la App (sirve para probar con hasta 5 números destino sin costo ni verificación). Cuando quieras pasar a producción con tu número real de negocio, ahí sí se registra ese número (proceso de unos minutos, sin trámite de negocio verificado si el volumen es bajo).
- [ ] **Verificación de negocio (Business Verification)**: no es obligatoria para empezar a probar, pero Meta la pide cuando quieres subir tu límite de mensajes/día o usar tu número real de producción a mayor escala. Puedes dejarla para después de las pruebas.

**Resultado de esta fase:** tienes un número de prueba de WhatsApp funcionando y tu Instagram conectado a la App de Meta, listos para recibir webhooks.

---

## Fase 1 — El "cerebro": escenario en Make.com

Mismo patrón que ya usas para voz (`docs/make-vapi-integration.md`), pero para texto. Arquitectura:

```
WhatsApp / Instagram (mensaje entra)
      ↓ webhook
   MAKE.COM
   ├── 1. Webhook recibe el mensaje (texto + número/usuario + nombre)
   ├── 2. Router: ¿es WhatsApp o Instagram? (mismo escenario, dos ramas)
   ├── 3. OpenAI (Chat Completions) — system prompt = docs/agent-prompt-chat.md
   │      + el historial reciente de esa conversación (para que no "olvide")
   ├── 4. Enviar respuesta de vuelta (WhatsApp Business Cloud / Instagram)
   └── 5. (opcional) Log a Google Sheets/Airtable — igual que CRM lite de tus clientes
```

### Cómo armarlo en Make (paso a paso)

1. **Nuevo escenario** en Make.
2. Módulo 1: app **WhatsApp Business Cloud** → trigger **"Watch Events"** (te pide conectar tu cuenta de Meta y elegir el número de prueba/producción creado en Fase 0).
3. Para Instagram: como Make no siempre tiene un módulo nativo completo para DMs de Instagram, la alternativa confiable es un módulo **HTTP → "Make a request"** apuntando al webhook de Meta para Instagram (mismo Graph API que Messenger) — si tu plan de Make sí trae el módulo nativo "Instagram for Business", úsalo primero y cae al HTTP genérico solo si falta algo.
4. Módulo 2: **Router** (para separar lógica de WhatsApp vs Instagram si el formato del mensaje difiere).
5. Módulo 3: **OpenAI — "Create a Chat Completion"**:
   - System message: pega el contenido de `docs/agent-prompt-chat.md`.
   - User message: el texto que llegó del cliente.
   - (Cuando quieras memoria de conversación real: guarda los últimos N mensajes en una Data Store de Make y mándalos como parte del contexto — fase 2, no necesario para arrancar.)
6. Módulo 4: **WhatsApp Business Cloud → "Send a Message"** (o el módulo equivalente de Instagram) con la respuesta de OpenAI.
7. Módulo 5 (opcional): **Google Sheets → Add a Row** con nombre/número/mensaje/respuesta — para tener un registro de leads, igual que recomiendas a clientes.

> No lo dejamos como blueprint `.json` importable como los otros dos (`agendar-cita`, `cobro-anticipo`) porque esos ya estaban **validados contra el esquema real de Make**; los módulos de WhatsApp/Instagram/OpenAI para este caso no los he probado en vivo y un blueprint mal armado puede fallar al importar o peor, importar mal y mandar mensajes rotos. Constrúyelo en la UI paso a paso (10-15 min) y, si quieres, cuando ya esté funcionando lo exportamos como blueprint reutilizable para clientes.

---

## Fase 2 — El prompt y la base de conocimiento

- El system prompt va en **`docs/agent-prompt-chat.md`** (nuevo, adaptado de `agent-prompt.md` para texto en vez de voz).
- Si algo del negocio cambia (precios, proceso), primero actualiza `docs/knowledge/*.md` (fuente de verdad) y luego refleja el cambio en el prompt — mismo flujo que ya sigues.
- Diferencias clave del modo texto vs voz:
  - Puede usar emojis con moderación (natural en WhatsApp/IG, no en llamada).
  - Respuestas un poco más cortas — la gente escanea texto, no escucha una explicación larga.
  - Puede mandar el link de la demo (`cal.com/samuel-garcia-gbsw4p/30min`) directo en el mensaje, algo que en voz no aplica.

---

## Fase 3 — QA

- [ ] Manda 10-15 mensajes de prueba desde tu celular personal al número de prueba de WhatsApp, cubriendo: saludo, precio, "¿cómo funciona?", agendar demo, pregunta rara fuera de guion, "quiero hablar con un humano".
- [ ] Repite lo mismo por DM de Instagram.
- [ ] Revisa que el fallback ("no sé, te conecto con el equipo") no invente información — mismo criterio que ya usas para voz (`docs/knowledge/04-objeciones.md`).
- [ ] Verifica que el registro en Sheets (si lo activaste) se esté llenando bien.

## Fase 4 — Lanzamiento

- [ ] Si vas a usar tu número de negocio real (no el de prueba), regístralo en la App de Meta (Fase 0) y repite el punto de conexión en el módulo de Make.
- [ ] Activa el escenario (toggle ON en Make).
- [ ] Prueba una vez más ya en el número/cuenta real antes de anunciarlo.
- [ ] Agrega el link de WhatsApp / usuario de Instagram donde haga falta (bio de IG, firma de correo, etc.).

## Fase 5 — Operación

- [ ] Revisa transcripciones cada semana al inicio — igual que haces con las llamadas de voz — y ajusta el prompt según lo que la gente realmente pregunta.
- [ ] Cuando esto funcione bien, es tu propio caso de prueba para ofrecerlo como demo en vivo a prospectos ("escríbele a mi WhatsApp/Instagram ahora mismo y pruébalo").

---

## Checklist de cuentas a crear

- [ ] Página de Facebook "Atendo"
- [ ] Meta Business Suite
- [ ] Instagram profesional enlazado
- [ ] App en Meta for Developers (productos WhatsApp + Instagram/Messenger)
- [ ] Escenario en Make.com
- [ ] (Ya tienes) cuenta de OpenAI / API key
- [ ] (Opcional) Google Sheet o Airtable para el log de conversaciones
