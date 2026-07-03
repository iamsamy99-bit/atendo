# Integración Vapi ↔ Make.com ↔ Telegram

> Cómo conectar a Sofía (Vapi) con los escenarios de Make.com y los bots de Telegram.
> Assistant ID: f861274a-c871-4ac5-8f5c-d3d5cb97c947

---

## Arquitectura general

```
Cliente llama
      ↓
   VAPI (Sofía)
      ↓ webhook
  MAKE.COM
   ├── Escenario 1: Notificación de llamada entrante → Telegram Samuel
   ├── Escenario 2: Captura de lead calificado → Telegram + Google Sheets
   ├── Escenario 3: Agendar cita (función en tiempo real) → Calendly → Telegram
   └── Escenario 4: Reporte al final de llamada → Telegram resumen
```

---

## PASO 1 — Crear los Webhooks en Make.com

Para cada escenario en Make.com:
1. Abrir el escenario → agregar módulo **"Webhooks" → "Custom webhook"**
2. Clic en **"Add"** → copiar la URL generada (formato: `https://hook.us2.make.com/xxxx`)
3. Guardar esa URL — se usará en Vapi

---

## PASO 2 — Configurar el serverUrl en Vapi

Una vez tengas la URL del webhook de Make.com, ejecuta este comando para conectarlo:

```bash
curl -X PATCH https://api.vapi.ai/assistant/f861274a-c871-4ac5-8f5c-d3d5cb97c947 \
  -H "Authorization: Bearer TU_VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://hook.us2.make.com/TU_WEBHOOK_PRINCIPAL"
  }'
```

Vapi enviará todos los eventos a esa URL. Make.com usa el campo `"message.type"` para filtrar y enrutar cada evento al escenario correcto.

---

## PASO 3 — Eventos que Vapi envía a Make.com

### Evento: `call-started`
Se dispara cuando alguien llama. Útil para notificar a Samuel al instante.

```json
{
  "message": {
    "type": "call-started",
    "call": {
      "id": "call-abc123",
      "assistantId": "f861274a-c871-4ac5-8f5c-d3d5cb97c947",
      "customer": {
        "number": "+5213171234567"
      },
      "startedAt": "2026-06-21T18:00:00Z"
    }
  }
}
```

### Evento: `end-of-call-report`
Se dispara al terminar la llamada. Contiene transcripción completa y resumen.

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "call-abc123",
      "customer": { "number": "+5213171234567" },
      "startedAt": "2026-06-21T18:00:00Z",
      "endedAt": "2026-06-21T18:05:30Z",
      "endedReason": "customer-ended-call"
    },
    "transcript": "Sofía: Hola, soy Sofía de Atendo...\nCliente: Hola, me interesa...",
    "summary": "El cliente Pedro López tiene un restaurante en CDMX. Interesado en Plan Negocio. Solicitó demo para el jueves.",
    "recordingUrl": "https://...",
    "durationSeconds": 330
  }
}
```

### Evento: `function-call`
Se dispara cuando Sofía llama a una función (agendar cita, capturar lead, etc.).

```json
{
  "message": {
    "type": "function-call",
    "call": { "id": "call-abc123" },
    "functionCall": {
      "name": "captureLeadInfo",
      "parameters": {
        "nombre": "Pedro López",
        "negocio": "Restaurante El Farol",
        "telefono": "+5213171234567",
        "interes": "Plan Negocio de voz",
        "disponibilidad": "jueves por la tarde"
      }
    }
  }
}
```

---

## PASO 4 — Funciones de Sofía en Vapi

Estas funciones permiten que Sofía ejecute acciones en tiempo real durante la llamada.
Agregar en el dashboard de Vapi → Assistant → **Tools** → **"Add function"**:

### Función 1: `captureLeadInfo`
Sofía llama esto cuando califica un prospecto interesado.

```json
{
  "name": "captureLeadInfo",
  "description": "Captura los datos del prospecto cuando muestra interés real en los servicios de Atendo.",
  "parameters": {
    "type": "object",
    "properties": {
      "nombre": { "type": "string", "description": "Nombre completo del prospecto" },
      "negocio": { "type": "string", "description": "Nombre o tipo de negocio" },
      "telefono": { "type": "string", "description": "Número de teléfono del prospecto" },
      "interes": { "type": "string", "description": "Servicio de interés: voz, chatbot, web, paquete" },
      "disponibilidad": { "type": "string", "description": "Cuándo puede asistir a la demo" }
    },
    "required": ["nombre", "negocio", "interes"]
  }
}
```

**Respuesta esperada de Make.com al recibir esta función:**
```json
{ "result": "Lead capturado correctamente. Samuel fue notificado." }
```

### Función 2: `agendarDemo`
Sofía llama esto cuando el prospecto acepta agendar la demo.

```json
{
  "name": "agendarDemo",
  "description": "Envía el link de Calendly al prospecto y notifica a Samuel para confirmar el agendamiento.",
  "parameters": {
    "type": "object",
    "properties": {
      "nombre": { "type": "string", "description": "Nombre del prospecto" },
      "telefono": { "type": "string", "description": "Teléfono para enviar el link" },
      "servicio": { "type": "string", "description": "Servicio de interés" }
    },
    "required": ["nombre", "servicio"]
  }
}
```

**Respuesta esperada de Make.com:**
```json
{ "result": "Demo agendada. Link enviado al cliente: https://calendly.com/iamsamy99/30min" }
```

### Función 3: `consultarDisponibilidad`
Sofía llama esto cuando el cliente pregunta por horarios disponibles.

```json
{
  "name": "consultarDisponibilidad",
  "description": "Consulta los próximos horarios disponibles para demo en Calendly.",
  "parameters": {
    "type": "object",
    "properties": {
      "preferencia": { "type": "string", "description": "Preferencia de horario del cliente (mañana, tarde, día específico)" }
    }
  }
}
```

**Respuesta esperada de Make.com:**
```json
{ "result": "Horarios disponibles esta semana: lunes 10am, martes 3pm, jueves 11am y 4pm." }
```

---

## PASO 5 — Escenarios de Make.com

### Escenario A: Notificación de llamada entrante

**Trigger:** Webhook (recibe evento de Vapi)
**Filtro:** `message.type = "call-started"`

**Módulos:**
1. **Webhook** — recibe el payload de Vapi
2. **Router** — filtra solo eventos `call-started`
3. **Telegram → Send a message** — envía a Samuel:
   ```
   📞 *LLAMADA ENTRANTE — Atendo*
   
   Número: {{message.call.customer.number}}
   Hora: {{formatDate(message.call.startedAt, "DD/MM/YYYY HH:mm")}}
   
   Sofía está atendiendo la llamada.
   ```

---

### Escenario B: Lead calificado capturado

**Trigger:** Webhook
**Filtro:** `message.type = "function-call"` Y `message.functionCall.name = "captureLeadInfo"`

**Módulos:**
1. **Webhook** — recibe el payload
2. **Router** — filtra `function-call` con nombre `captureLeadInfo`
3. **Telegram → Send a message** — envía a Samuel:
   ```
   🎯 *LEAD CALIFICADO — Atendo*
   
   👤 Nombre: {{message.functionCall.parameters.nombre}}
   🏢 Negocio: {{message.functionCall.parameters.negocio}}
   📱 Teléfono: {{message.functionCall.parameters.telefono}}
   💼 Interés: {{message.functionCall.parameters.interes}}
   🗓 Disponibilidad: {{message.functionCall.parameters.disponibilidad}}
   
   Actuar rápido — cliente en llamada ahora.
   ```
4. **Google Sheets → Add a row** — guarda el lead en hoja de cálculo
5. **Webhook Response** — devuelve `{"result": "Lead capturado. Samuel notificado."}` a Vapi

---

### Escenario C: Solicitud de demo (agendarDemo)

**Trigger:** Webhook
**Filtro:** `message.type = "function-call"` Y `message.functionCall.name = "agendarDemo"`

**Módulos:**
1. **Webhook** — recibe el payload
2. **Router** — filtra función `agendarDemo`
3. **Telegram → Send a message** — notifica a Samuel:
   ```
   📅 *DEMO SOLICITADA — Atendo*
   
   👤 {{message.functionCall.parameters.nombre}}
   💼 Interés: {{message.functionCall.parameters.servicio}}
   📱 {{message.functionCall.parameters.telefono}}
   
   Cliente listo para agendar. Link Calendly:
   https://calendly.com/iamsamy99/30min
   ```
4. **(Opcional) WhatsApp via API** — envía link de Calendly al cliente directamente
5. **Webhook Response** — devuelve `{"result": "Demo agendada. Link enviado."}` a Vapi

---

### Escenario D: Reporte al final de la llamada

**Trigger:** Webhook
**Filtro:** `message.type = "end-of-call-report"`

**Módulos:**
1. **Webhook** — recibe el reporte completo
2. **Router** — filtra `end-of-call-report`
3. **Telegram → Send a message** — envía resumen a Samuel:
   ```
   📋 *LLAMADA FINALIZADA — Atendo*
   
   📱 Número: {{message.call.customer.number}}
   ⏱ Duración: {{round(message.durationSeconds / 60, 1)}} min
   🔚 Razón: {{message.call.endedReason}}
   
   📝 *Resumen:*
   {{message.summary}}
   
   🎙 Ver grabación: {{message.recordingUrl}}
   ```
4. **Google Sheets → Add a row** — guarda el registro de la llamada

---

## PASO 6 — Actualizar el system prompt de Sofía con las funciones

Agregar al final del system prompt actual en Vapi:

```
[FUNCIONES DISPONIBLES]
Tienes acceso a las siguientes funciones. Úsalas cuando corresponda:

- captureLeadInfo: Llama esta función cuando el prospecto muestre interés real
  y hayas obtenido su nombre, tipo de negocio y servicio de interés.
  NO pidas teléfono si el prospecto no lo dio voluntariamente.

- agendarDemo: Llama esta función cuando el prospecto confirme que quiere agendar
  la demo. Siempre menciona que Samuel los atenderá personalmente.

- consultarDisponibilidad: Llama esta función cuando el cliente pregunte por
  horarios disponibles antes de comprometerse a agendar.

Después de llamar una función, usa la respuesta para continuar la conversación
de forma natural. No menciones que llamaste a una función.
```

---

## PASO 7 — Actualizar las funciones en Vapi vía API

Una vez creados los webhooks en Make.com, ejecutar:

```bash
curl -X PATCH https://api.vapi.ai/assistant/f861274a-c871-4ac5-8f5c-d3d5cb97c947 \
  -H "Authorization: Bearer TU_VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://hook.us2.make.com/TU_WEBHOOK_URL",
    "model": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "captureLeadInfo",
            "description": "Captura los datos del prospecto cuando muestra interés real.",
            "parameters": {
              "type": "object",
              "properties": {
                "nombre": { "type": "string" },
                "negocio": { "type": "string" },
                "telefono": { "type": "string" },
                "interes": { "type": "string" },
                "disponibilidad": { "type": "string" }
              },
              "required": ["nombre", "negocio", "interes"]
            }
          }
        },
        {
          "type": "function",
          "function": {
            "name": "agendarDemo",
            "description": "Notifica a Samuel y envía el link de Calendly cuando el prospecto quiere agendar.",
            "parameters": {
              "type": "object",
              "properties": {
                "nombre": { "type": "string" },
                "telefono": { "type": "string" },
                "servicio": { "type": "string" }
              },
              "required": ["nombre", "servicio"]
            }
          }
        },
        {
          "type": "function",
          "function": {
            "name": "consultarDisponibilidad",
            "description": "Consulta horarios disponibles para la demo.",
            "parameters": {
              "type": "object",
              "properties": {
                "preferencia": { "type": "string" }
              }
            }
          }
        }
      ]
    }
  }'
```

---

## Checklist de lanzamiento

- [ ] Crear los 4 escenarios en Make.com con sus webhooks
- [ ] Copiar la URL del webhook principal de Make.com
- [ ] Ejecutar el PATCH de Vapi con la serverUrl y las funciones (Paso 7)
- [ ] Activar todos los escenarios en Make.com
- [ ] Hacer una llamada de prueba al número de Vapi
- [ ] Verificar que llega notificación a Telegram en cada evento
- [ ] Verificar que el lead se guarda en Google Sheets
- [ ] Confirmar que la respuesta de Make.com llega a Sofía (Paso webhook response)
