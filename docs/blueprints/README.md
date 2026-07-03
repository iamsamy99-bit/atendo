# Blueprints reutilizables de Atendo

Plantillas de automatización listas para **importar en Make y clonar por cliente**. La idea: construir una vez, replicar en minutos. Complemento de [`../integraciones.md`](../integraciones.md).

## Qué hay aquí

| Archivo | Qué hace | Módulos |
|---|---|---|
| `agendar-cita.blueprint.json` | El agente de voz agenda una cita → crea evento en Google Calendar → confirma por WhatsApp → le responde al agente para que lo diga en la llamada | Webhook · Google Calendar · Twilio · Webhook Respond |
| `cobro-anticipo.blueprint.json` | El agente cobra un anticipo → genera link de pago Stripe → lo envía por WhatsApp → confirma en la llamada | Webhook · Stripe · Twilio · Webhook Respond |

Ambos están **validados contra el esquema de Make** (importan sin error de estructura). Falta solo conectar cuentas y elegir números/precios en la UI.

---

## Cómo importar un blueprint (2 min)

1. En Make: **Create a new scenario**.
2. Abajo, clic en los **⋯ (tres puntos) → Import Blueprint**.
3. Sube el archivo `.json`.
4. Make te pedirá **reconectar las cuentas** (Google Calendar, Twilio, Stripe) → selecciona o crea la conexión del cliente.
5. En el módulo **Webhook** (primero), copia la **URL** que genera. Esa URL va en la herramienta de Vapi (ver abajo).
6. Guarda y activa (toggle **ON**).

> ⚠️ **Plan Free de Make = máximo 2 escenarios activos.** Para operar varios clientes, sube a **Core ($9/mes)** o migra a **n8n** (ver `../integraciones.md`).

---

## Checklist de clonado por cliente

Cada vez que das de alta un cliente Empresa con agenda/pagos:

- [ ] Importar el blueprint (`agendar-cita` y/o `cobro-anticipo`)
- [ ] Conectar el **Google Calendar** del cliente (o el tuyo si tú administras)
- [ ] Conectar **Twilio** y elegir el **sender de WhatsApp** aprobado del cliente
- [ ] *(anticipo)* Conectar **Stripe** del cliente y crear el **Price** del anticipo (ver nota Stripe)
- [ ] Copiar la **URL del webhook** de Make
- [ ] Pegar esa URL en la **herramienta de Vapi** del agente (abajo)
- [ ] Ajustar el **texto del WhatsApp** (nombre del negocio, tono)
- [ ] Probar con una llamada real y confirmar que llega Calendar + WhatsApp + que el agente lo dice
- [ ] Activar el escenario

---

## Herramientas de Vapi que disparan estos blueprints

Agrega estas *tools* al asistente (Sofía/Diego o el del cliente). Son **síncronas** (`async: false`) para que el agente espere la respuesta del `Webhook Respond` y la diga en voz.

### `agendarCita`
```json
{
  "type": "function",
  "async": false,
  "server": { "url": "PEGA_AQUI_LA_URL_DEL_WEBHOOK_DE_MAKE" },
  "function": {
    "name": "agendarCita",
    "description": "Agenda una cita en el calendario cuando el cliente confirma dia, hora y servicio.",
    "parameters": {
      "type": "object",
      "properties": {
        "nombre":   { "type": "string", "description": "Nombre del cliente" },
        "telefono": { "type": "string", "description": "Telefono con lada, sin +, ej. 5215512345678" },
        "servicio": { "type": "string", "description": "Servicio o motivo de la cita" },
        "inicio":   { "type": "string", "description": "Fecha y hora de inicio en ISO 8601, ej. 2026-07-10T16:00:00-06:00" },
        "fin":      { "type": "string", "description": "Fecha y hora de fin en ISO 8601" }
      },
      "required": ["nombre", "telefono", "servicio", "inicio", "fin"]
    }
  }
}
```

### `cobrarAnticipo`
```json
{
  "type": "function",
  "async": false,
  "server": { "url": "PEGA_AQUI_LA_URL_DEL_WEBHOOK_DE_MAKE" },
  "function": {
    "name": "cobrarAnticipo",
    "description": "Genera y envia un link de pago de anticipo por WhatsApp para confirmar la cita.",
    "parameters": {
      "type": "object",
      "properties": {
        "nombre":   { "type": "string", "description": "Nombre del cliente" },
        "telefono": { "type": "string", "description": "Telefono con lada, sin +" }
      },
      "required": ["nombre", "telefono"]
    }
  }
}
```

En el prompt del agente agrega una instrucción tipo: *"Cuando el cliente confirme la cita, usa la herramienta agendarCita con sus datos. Si el negocio pide anticipo, usa cobrarAnticipo."*

---

## Notas importantes

- **Indexado de `toolCallList`:** los mappers usan `toolCallList[0]`. Vapi normalmente manda el arreglo 0-indexado, pero en pruebas previas se vio `[1]`. En el **primer test real**, revisa el historial de ejecución de Make: si los campos llegan vacíos, cambia `[0]` por `[1]` en los mappers. (Pendiente de confirmar — ver memoria del proyecto.)

- **WhatsApp por Twilio:** el `from` del blueprint (`whatsapp:+14155238886`) es el **sandbox de Twilio** (solo sirve para pruebas con números que se unieron al sandbox). En producción reemplázalo por el **sender de WhatsApp aprobado** del cliente. Alternativa recomendada en MX: **WhatsApp Business Cloud** (app `whatsapp-business-cloud` en Make) — mejor precio por conversación.

- **SMS en vez de WhatsApp:** si el cliente no tiene WhatsApp aprobado, duplica el módulo Twilio y quita el prefijo `whatsapp:` del `to`/`from` para mandar SMS normal.

- **Stripe — crear el Price del anticipo (una vez por cliente):** en Stripe → **Products** → crea un producto "Anticipo de cita" con un precio fijo (ej. $200 MXN) → copia el **Price ID** (`price_...`) → pégalo en el módulo Stripe reemplazando `price_REEMPLAZAR_CON_TU_PRICE_ID`. `createPaymentLink` requiere un Price existente; no acepta monto libre.

- **Confirmar pago (opcional, avanzado):** para marcar la cita como confirmada solo cuando pagan, agrega un 2º escenario con trigger **Stripe → Watch Events** (`checkout.session.completed`) que actualice el evento de Calendar o el CRM. No incluido aquí para mantenerlo simple.

- **n8n:** la misma lógica se replica en n8n (nodos Webhook → Google Calendar → Twilio → Respond to Webhook). Cuando el volumen de operaciones en Make suba, migra estos flujos a n8n self-host para ahorrar (ver `../integraciones.md`).

---

## Versionado de módulos (por si Make actualiza)

Construidos y validados el 01-jul-2026 con: `gateway@1`, `google-calendar@5`, `twilio@2`, `stripe@1`, `builtin@1`. Si Make sube una app de versión mayor, el blueprint sigue importando; solo revisa que el módulo no haya cambiado nombres de campos.
