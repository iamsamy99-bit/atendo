# Agente de Voz Sofía — Diseño del Sistema

**Fecha:** 2026-06-16  
**Proyecto:** Atendo — Voice Agency Landing  
**Estado:** Aprobado, listo para implementación

---

## Resumen

Sofía es el agente de voz IA de Atendo. Funciona como recepcionista de ventas (responde preguntas sobre Atendo, agenda demos) y como demo en vivo del producto (actúa como recepcionista de un negocio ficticio). Es bilingüe (español/inglés automático), accesible desde el widget web del landing y desde un número de teléfono US real.

El objetivo es triple:
1. **Demo en vivo** para prospectos que llegan desde la landing, LinkedIn o Upwork
2. **Validación del stack** (ElevenLabs Conv. AI + OpenAI + Twilio) antes de ofrecerlo a clientes
3. **Generación de una guía replicable** para futuros deployments con clientes

---

## Arquitectura

```
CANALES DE ENTRADA
┌─────────────────────────┬──────────────────────────┐
│  Web Widget (landing)   │  Teléfono (+1 US Twilio) │
│  elevenlabs-convai      │  Twilio → webhook EL      │
└────────────┬────────────┴────────────┬─────────────┘
             │                         │
             └──────────┬──────────────┘
                        ▼
          ┌─────────────────────────────┐
          │   ElevenLabs Conversational │
          │            AI               │
          │  ┌─────┐ ┌──────┐ ┌──────┐ │
          │  │ STT │ │ LLM  │ │ TTS  │ │
          │  │ EL  │ │OAI   │ │ EL   │ │
          │  └─────┘ └──────┘ └──────┘ │
          └─────────────────────────────┘
```

| Capa | Servicio | Tier gratuito | Costo uso bajo |
|------|----------|---------------|----------------|
| STT (transcripción) | ElevenLabs built-in | Incluido | Incluido |
| LLM (cerebro) | OpenAI GPT-4o-mini | — | ~$0.001/1K tokens |
| TTS (voz) | ElevenLabs Conv. AI | 10 min/mes | ~$0.08/min extra |
| Widget web | ElevenLabs embed | Incluido | Incluido |
| Telefonía | Twilio US number | Trial $15 | ~$1.15/mes + $0.0085/min |
| **Total mes ligero** | | | **~$1–3 USD** |

Un solo agente (`agent-id`) sirve para ambos canales. Se configura una vez en ElevenLabs dashboard.

---

## Personalidad y Comportamiento

**Nombre:** Sofía  
**Tono:** Profesional, cálida, directa. Sin relleno ni frases vacías.  
**Idioma:** Detecta el idioma del primer mensaje del usuario y lo mantiene durante toda la conversación (español mexicano o inglés).

### Modo 1 — Recepcionista de Atendo (default)

Sofía responde como representante de Atendo:
- Explica qué es Atendo y qué tipo de agentes crea
- Describe los planes (Esencial, Pro, Empresa) en la moneda del usuario
- Califica al prospecto: ¿tiene negocio? ¿cuántas llamadas/mes aproximadamente?
- Si hay interés, comparte el link de Calendly para agendar demo: `https://calendly.com/iamsamy99/30min`
- No inventa precios ni promete SLAs no definidos

### Modo 2 — Demo en vivo (activado por frase clave)

Frases que activan el modo demo:
- ES: "muéstrame cómo funciona", "hazme un demo", "quiero ver un ejemplo"
- EN: "show me a demo", "how does it work", "give me an example"

En modo demo, Sofía adopta el rol de recepcionista de **"Clínica Dental Vista"** (negocio ficticio):
- Confirma o agenda citas
- Da horarios de atención (L-V 9:00-18:00, S 9:00-14:00)
- Toma nombre y motivo de consulta
- Deriva urgencias a número de emergencias

Salida del demo:
- Frases: "gracias", "listo", "exit demo", "salir del demo"
- Sofía vuelve a ser representante de Atendo y pregunta si tiene dudas sobre el servicio

### System Prompt

El system prompt vive en `docs/agent-prompt.md` (archivo separado, editable por cliente). Estructura:

```
[IDENTIDAD] Eres Sofía, asistente de voz de Atendo...
[IDIOMA] Detecta el idioma del primer mensaje...
[MODO ATENDO] Info de servicios, precios, Calendly...
[TRIGGER DEMO] Frases que cambian el modo...
[MODO DEMO] Rol como recepcionista de Clínica Dental Vista...
[SALIDA DEMO] Cómo regresar al modo Atendo...
[LÍMITES] No inventes, no prometas, escala si no sabes...
```

---

## Web Widget

### Integración en el landing

**Archivo nuevo:** `src/components/VoiceWidget.ts`

Lee la variable de entorno `VITE_ELEVENLABS_AGENT_ID` e inyecta el Web Component de ElevenLabs:

```typescript
// src/components/VoiceWidget.ts
export function initVoiceWidget(agentId: string) {
  const script = document.createElement('script')
  script.src = 'https://elevenlabs.io/convai-widget/index.js'
  script.async = true
  document.head.appendChild(script)

  const widget = document.createElement('elevenlabs-convai')
  widget.setAttribute('agent-id', agentId)
  document.body.appendChild(widget)
}
```

**`src/main.ts`:** llama a `initVoiceWidget(import.meta.env.VITE_ELEVENLABS_AGENT_ID)`.

**Variable de entorno:**
```env
# .env.local (no se commitea)
VITE_ELEVENLABS_AGENT_ID=xxxx

# .env.example (se commitea)
VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
```

### UX en la página

- Widget flotante **abajo a la izquierda** (el bot de Telegram flota a la derecha — no chocan)
- Tooltip `"Habla con Sofía · Talk to Sofía"` aparece tras 5 segundos de inactividad
- En la sección Hero: botón secundario que activa el widget programáticamente
- Claves i18n nuevas:
  - `hero.cta_demo`: "Prueba el agente en vivo →" / "Try the live agent →"
  - `widget.tooltip`: "Habla con Sofía" / "Talk to Sofía"

---

## Integración Telefónica (Twilio)

### Setup de Twilio

1. Crear cuenta en twilio.com (trial incluye ~$15 USD de crédito)
2. Comprar número US local (+1) desde la consola: ~$1.15/mes
3. Anotar: Account SID, Auth Token, número comprado

### Conectar Twilio a ElevenLabs

Desde el dashboard de ElevenLabs Conversational AI:
1. Ir a la sección **Phone Numbers**
2. Clic en **Add phone number → Twilio**
3. Ingresar Account SID + Auth Token
4. Seleccionar el número comprado
5. ElevenLabs configura el webhook automáticamente en Twilio

No se requiere código de webhook propio. ElevenLabs maneja el SIP/WebSocket internamente.

### Verificación

Llamar al número desde un celular → Sofía debe contestar en ~3 segundos → responder en el idioma que uses.

---

## Guía Replicable

**Archivo:** `docs/guia-agente-voz.md`

Documento paso a paso para replicar este setup con cualquier cliente. Cubre:
1. Cuentas necesarias y tier gratuito de cada una
2. Crear el agente en ElevenLabs dashboard (system prompt, voz, LLM)
3. Obtener y conectar número Twilio
4. Integrar el widget en cualquier sitio web (HTML, Vite, WordPress)
5. Personalizar para un nuevo cliente (qué cambiar en `agent-prompt.md`, cómo clonar el agente)
6. Checklist de lanzamiento
7. Tabla de costos por volumen y márgenes sugeridos

---

## Archivos a Crear / Modificar

| Archivo | Acción |
|---------|--------|
| `src/components/VoiceWidget.ts` | Crear |
| `src/main.ts` | Modificar — llamar a `initVoiceWidget` |
| `src/i18n/es.json` | Modificar — añadir claves `hero.cta_demo`, `widget.tooltip` |
| `src/i18n/en.json` | Modificar — ídem en inglés |
| `index.html` | Modificar — botón CTA demo en Hero |
| `.env.example` | Crear/modificar — añadir `VITE_ELEVENLABS_AGENT_ID` |
| `docs/agent-prompt.md` | Crear — system prompt base de Sofía |
| `docs/guia-agente-voz.md` | Crear — guía replicable completa |

---

## Fuera de Alcance (esta iteración)

- Número MX (+52): requiere bundle IFT de Twilio, se hace cuando haya primer cliente mexicano
- Dashboard de analytics de llamadas
- CRM integration
- WhatsApp (proyecto separado `atendo-whatsapp-cf`)
- Múltiples voces / A-B testing de prompts
