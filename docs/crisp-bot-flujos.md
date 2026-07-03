# Flujos de Conversación — Crisp Bot

> Para configurar en: Crisp Dashboard → Plugins → Chatbot → New Scenario
> Cada sección es un escenario independiente. Empieza por el flujo de Bienvenida.

---

## FLUJO 1 — Bienvenida (se activa cuando alguien abre el chat)

**Trigger:** Visitor opens chat / first visit

```
Mensaje 1 (bot):
"¡Hola! Soy Sofía 👋 ¿En qué te puedo ayudar hoy?"

→ Mostrar botones de respuesta rápida:
   [¿Qué es Atendo?]
   [Ver precios]
   [Agendar demo gratis]
   [Hablar con Samuel]
```

**Si elige "¿Qué es Atendo?"** → ir a Flujo 2  
**Si elige "Ver precios"** → ir a Flujo 3  
**Si elige "Agendar demo gratis"** → ir a Flujo 4  
**Si elige "Hablar con Samuel"** → ir a Flujo 5  
**Si escribe algo distinto** → el AI Respond / agente humano toma control

---

## FLUJO 2 — ¿Qué es Atendo?

**Trigger:** Botón "¿Qué es Atendo?" o palabras clave: "qué hacen", "cómo funciona", "qué es"

```
Mensaje 1 (bot):
"Atendo crea agentes de voz con IA que atienden las llamadas de tu negocio las 24 horas, los 7 días de la semana — incluyendo noches, fines de semana y días festivos.

El agente contesta con voz natural, responde preguntas de tus clientes y agenda citas automáticamente. La mayoría de los clientes no nota diferencia con una persona real."

Mensaje 2 (bot):
"¿Tienes un negocio que recibe llamadas de clientes?"

→ Mostrar botones:
   [Sí, me interesa saber más]
   [Ver precios]
   [Agendar demo gratuita]
```

**Si elige "Sí, me interesa":**
```
"Perfecto. La mejor forma de ver cómo funcionaría para tu negocio específico es con una demo de 30 minutos — es gratis y sin compromiso.

👉 https://calendly.com/iamsamy99/30min

Samuel te muestra el agente en acción y responde todas tus dudas."
```

---

## FLUJO 3 — Precios

**Trigger:** Botón "Ver precios" o palabras clave: "precio", "costo", "cuánto", "tarifa", "planes"

```
Mensaje 1 (bot):
"Tenemos planes para agentes de voz y para chatbots de WhatsApp/Telegram. ¿Cuál te interesa?"

→ Mostrar botones:
   [Agente de voz (llamadas)]
   [Chatbot (WhatsApp/Telegram)]
   [Paquete voz + chat]
```

**Si elige "Agente de voz":**
```
"Planes de agente de voz (mensuales, sin contrato):

• Esencial — $4,900 MXN / $497 USD
  1 agente · hasta 300 min/mes · agenda de citas

• Negocio ⭐ — $9,900 MXN / $997 USD
  1 agente · hasta 1,000 min/mes · reportes + soporte por WhatsApp

• Empresa — $24,900 MXN / $2,497 USD
  Varios agentes · minutos a la medida · sitio web incluido

¿Quieres ver cuál se adapta mejor a tu negocio?"

→ Mostrar botones:
   [Agendar demo gratuita]
   [Tengo una duda]
```

**Si elige "Chatbot":**
```
"Planes de chatbot (WhatsApp y Telegram):

• Chat Esencial — $1,490 MXN / $149 USD
  1 canal · 500 conversaciones/mes

• Chat Negocio ⭐ — $2,990 MXN / $299 USD
  WhatsApp + Telegram · 1,000 conversaciones/mes

• Chat Pro — $4,990 MXN / $499 USD
  WhatsApp + Telegram + Instagram · 3,000 conversaciones/mes"

→ Mostrar botones:
   [Agendar demo gratuita]
   [Ver paquetes voz + chat]
```

**Si elige "Paquete voz + chat":**
```
"Combinar voz + chat tiene un descuento de entre 20% y 22%:

• Esencial Completo — $5,900 MXN / $597 USD
• Negocio Completo ⭐ — $11,900 MXN / $1,197 USD
• Empresa Completo — $27,900 MXN / $2,797 USD

¿Agendamos una demo para ver cuál encaja mejor con tu negocio?"

→ Mostrar botones:
   [Sí, agendar demo]
   [Quiero más información]
```

---

## FLUJO 4 — Agendar Demo

**Trigger:** Botón "Agendar demo" o palabras clave: "demo", "reunión", "llamada", "agendar", "quiero ver"

```
Mensaje 1 (bot):
"La demo es gratuita, dura 30 minutos y Samuel te muestra el agente en acción para tu tipo de negocio.

👉 Elige tu horario aquí:
https://calendly.com/iamsamy99/30min

¿Hay algo más en lo que te pueda ayudar mientras tanto?"
```

**Variante si no hacen clic en el link (30 segundos después):**
```
"También puedes escribirnos directamente por WhatsApp si prefieres:
💬 https://wa.me/523171340304"
```

---

## FLUJO 5 — Hablar con Samuel (humano)

**Trigger:** Botón "Hablar con Samuel" o palabras clave: "quiero hablar con alguien", "persona real", "Samuel"

```
Mensaje 1 (bot):
"Con gusto te conecto. Samuel responde personalmente por WhatsApp en horario hábil:

💬 https://wa.me/523171340304

También puedes agendar una llamada directamente:
📅 https://calendly.com/iamsamy99/30min

¿O prefieres que tomemos tu nombre y correo para que Samuel te escriba?"

→ Mostrar botones:
   [Dejar mis datos]
   [Ir a WhatsApp]
   [Agendar llamada]
```

**Si elige "Dejar mis datos":**
```
Bot recoge:
1. "¿Cuál es tu nombre?"  → guardar como [nombre]
2. "¿Y tu correo o WhatsApp para que Samuel te contacte?"  → guardar como [contacto]
3. "¿De qué trata tu consulta en pocas palabras?"  → guardar como [consulta]

Confirmación:
"Listo, [nombre]. Samuel recibirá tu mensaje y te escribirá pronto.

Mientras tanto, si tienes alguna duda puedo ayudarte yo."
```

---

## FLUJO 6 — Ya soy cliente (soporte)

**Trigger:** palabras clave: "ya soy cliente", "tengo un problema", "mi agente", "no funciona", "cambio"

```
Mensaje 1 (bot):
"Hola, me alegra que seas parte de Atendo. Para soporte técnico o cambios en tu agente, la forma más rápida es:

💬 WhatsApp: https://wa.me/523171340304
✉️ Correo: samgarcia.tech@gmail.com

Samuel responde el mismo día en horario hábil (lunes a viernes 9:00–18:00 hora CDMX).

¿Cuál es el problema? Puedo orientarte mientras tanto."
```

---

## FLUJO 7 — Objeción: "Es caro"

**Trigger:** palabras clave: "caro", "es mucho", "no tengo presupuesto", "muy costoso"

```
Mensaje 1 (bot):
"Entiendo. Comparado con contratar una recepcionista, el agente cuesta menos y trabaja más horas.

Una recepcionista de tiempo completo en México cuesta entre $8,000 y $15,000 MXN al mes — solo en horario de oficina. El Plan Esencial de Atendo es $4,900 MXN y cubre las 24 horas, los 7 días.

Si el agente captura una sola cita extra al mes que de otra forma se pierda, ya se paga solo.

¿Quieres ver cómo funcionaría para tu negocio específico?"

→ Mostrar botones:
   [Agendar demo gratuita]
   [Ver planes]
```

---

## FLUJO 8 — Fuera de horario (away message)

**Trigger:** Cuando no hay agentes disponibles (horario fuera de oficina)

```
Mensaje automático:
"Hola 👋 En este momento no estamos en línea, pero tu mensaje es importante.

Te respondemos en el siguiente horario hábil. Si es urgente:
💬 WhatsApp: https://wa.me/523171340304

También puedes agendar una demo directamente:
📅 https://calendly.com/iamsamy99/30min"
```

---

## FLUJO 9 — Fallback (no entendió)

**Trigger:** cuando el bot no reconoce el mensaje (3 intentos sin match)

```
"No estoy segura de entender bien tu pregunta. ¿Te puedo ayudar con alguno de estos temas?"

→ Mostrar botones:
   [¿Qué es Atendo?]
   [Ver precios]
   [Agendar demo]
   [Hablar con Samuel]
```

---

## Guía de configuración en Crisp

### Plan Free — lo que puedes hacer sin costo
- ✅ Mensaje de bienvenida automático (Flujo 1, solo texto, sin botones)
- ✅ Mensaje de ausencia (Flujo 8)
- ✅ Respuestas guardadas con atajos (`/demo`, `/precio`, `/contacto`) para responder tú mismo
- ❌ Botones de respuesta rápida (requiere plan de pago)
- ❌ Flujos encadenados (requiere plan de pago)

### Plan Essentials o superior
- ✅ Todos los flujos completos con botones
- ✅ Recolección de datos (nombre, correo)
- ✅ AI Respond con el prompt de `crisp-bot-prompt.md`

### Atajos recomendados para respuesta rápida manual
Ir a Settings → Saved Replies → crear los siguientes:

| Atajo | Texto |
|---|---|
| `/demo` | La demo es gratuita y dura 30 min. Agéndala aquí: https://calendly.com/iamsamy99/30min |
| `/precio` | Planes desde $4,900 MXN/mes. ¿Te mando el detalle de precios? |
| `/voz` | El agente contesta llamadas 24/7, agenda citas y habla español e inglés. |
| `/wa` | También puedes escribirnos por WhatsApp: https://wa.me/523171340304 |
| `/como` | El agente queda listo en 3 a 5 días hábiles después de una llamada de 30 min. |
| `/contrato` | Sin contrato. Es mensual y se puede cancelar con 30 días de aviso. |
