# Guía: Cómo Desplegar un Agente de Voz IA — Stack Atendo

> Proceso completo para crear e integrar un agente de voz bilingüe (ES/EN).
> Tiempo: 2–4 horas la primera vez, ~1 hora en deployments subsiguientes.

---

## 1. Cuentas necesarias

| Servicio | Plan mínimo | Costo inicial |
|----------|-------------|---------------|
| ElevenLabs | Free (10 min/mes) | $0 |
| OpenAI | Pay-as-you-go | ~$0.001/1K tokens |
| Twilio | Trial | $0 (~$15 USD de crédito incluido) |

- ElevenLabs: https://elevenlabs.io
- OpenAI API key: https://platform.openai.com/api-keys
- Twilio: https://twilio.com

---

## 2. Crear el agente en ElevenLabs

1. Ir a https://elevenlabs.io/app/conversational-ai → **"New agent"**
2. Configurar:
   - **Agent name:** `Nombre del Negocio — Recepcionista`
   - **First message:** saludo inicial natural del agente
   - **System prompt:** copiar y adaptar `docs/agent-prompt.md` de este repo
   - **LLM:** Custom → OpenAI → modelo `gpt-4o-mini` → pegar OpenAI API key
   - **Voice:** elegir voz en el idioma del cliente (ES-MX recomendado para México)
3. Guardar → copiar el **Agent ID** desde la URL del dashboard

### Elegir la voz correcta

- ES-MX: buscar voces con etiqueta "Spanish (Mexico)" o "es-MX"
- Probar 2-3 voces en el playground antes de decidir
- Para bilingüe: elegir voz que suene natural en ambos idiomas

---

## 3. Obtener número de teléfono con Twilio

1. Crear cuenta en https://twilio.com (trial ~$15 USD de crédito)
2. En la consola: **Phone Numbers → Manage → Buy a number**
   - **US (+1):** listo en 2 minutos, sin trámites — recomendado para empezar
   - **MX (+52):** requiere IFT Regulatory Bundle (subir INE + CURP del cliente, 3-5 días hábiles)
3. Anotar: número comprado, Account SID (`AC...`), Auth Token

### Conectar Twilio a ElevenLabs

1. Dashboard del agente → pestaña **"Phone numbers"**
2. **"Add phone number"** → **Twilio**
3. Ingresar Account SID + Auth Token + número
4. Clic **"Import"** — ElevenLabs configura el webhook automáticamente
5. Llamar al número para verificar (debe contestar en <5 segundos)

> **Alternativa para clientes MX:** el cliente desvía su número Telmex/Telcel existente
> al número Twilio US. Sin trámites IFT.

---

## 4. Integrar el widget en el sitio web del cliente

### HTML estático / cualquier CMS

Añadir antes de `</body>`:

```html
<script src="https://elevenlabs.io/convai-widget/index.js" async></script>
<elevenlabs-convai agent-id="TU_AGENT_ID"></elevenlabs-convai>
```

### Vite + TypeScript (patrón de este repo)

1. Añadir a `.env.local` (no commitear):
   ```env
   VITE_ELEVENLABS_AGENT_ID=TU_AGENT_ID
   ```
2. Copiar `src/components/VoiceWidget.ts` de este repo al proyecto
3. En `src/main.ts`:
   ```typescript
   import { initVoiceWidget, openVoiceWidget } from './components/VoiceWidget'
   initVoiceWidget(import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? '')
   document.getElementById('voice-cta')?.addEventListener('click', () => openVoiceWidget())
   ```
4. Si hay botones flotantes (WhatsApp, Telegram), moverlos arriba para no chocar:
   - `.wa-float`: `bottom: 18px` → `bottom: 82px`
   - `.tg-float`: `bottom: 76px` → `bottom: 146px`

### WordPress

1. **Apariencia → Editor de temas → footer.php** — añadir antes de `</body>`
2. Alternativa: plugin "Insert Headers and Footers" (sin tocar código)

---

## 5. Personalizar para un nuevo cliente

### Qué cambiar en `docs/agent-prompt.md`

| Bloque | Qué editar |
|--------|------------|
| `[IDENTIDAD]` | Nombre del agente y del negocio |
| `[MODO ATENDO]` | Servicios, precios, Calendly link del cliente |
| `[MODO DEMO]` | Eliminar si no aplica, o cambiar por caso de uso del negocio |
| `[LÍMITES]` | Restricciones específicas del cliente |

### Clonar el agente en ElevenLabs

En el dashboard: tres puntos del agente → **"Duplicate"** → editar system prompt con info del nuevo cliente.

### Agregar variable de entorno en Netlify

**Site settings → Environment variables → Add variable**
- Key: `VITE_ELEVENLABS_AGENT_ID`
- Value: agent-id del nuevo cliente

---

## 6. Checklist de lanzamiento

- [ ] Agente responde en el idioma correcto desde el primer mensaje
- [ ] Primer mensaje suena natural y menciona el negocio
- [ ] Responde correctamente las 5 preguntas más comunes del negocio
- [ ] No inventa información fuera del system prompt
- [ ] Widget se ve bien en móvil (Chrome DevTools → responsive)
- [ ] Número de teléfono contesta en <5 segundos
- [ ] Probado desde número diferente al registrado en Twilio
- [ ] Variable de entorno configurada en Netlify/hosting
- [ ] `.env.local` NO está en git

---

## 7. Costos reales y márgenes

### Costo por volumen mensual

| Min/mes | ElevenLabs | Twilio llamadas | Twilio número | OpenAI | **Total** |
|---------|------------|-----------------|---------------|--------|-----------|
| 10 (free) | $0 | ~$0.85 | $1.15 | ~$0.50 | **~$2.50** |
| 50 | $3.20 | ~$4.25 | $1.15 | ~$1.50 | **~$10** |
| 300 | $19.20 | ~$25.50 | $1.15 | ~$5 | **~$51** |
| 1,000 | $64 | ~$85 | $1.15 | ~$15 | **~$165** |

*ElevenLabs: $0.08/min sobre los 10 free. Twilio inbound: ~$0.0085/min.*

### Precio vs costo

| Plan Atendo | Costo real | Precio cliente | Margen |
|-------------|------------|----------------|--------|
| Esencial (300 min) | ~$51/mes | $497 USD/mes | ~90% |
| Negocio (1,000 min) | ~$165/mes | $997 USD/mes | ~83% |
| Empresa (custom) | ~$165+/mes | $2,497 USD/mes | >90% |

---

## 8. Escalado y alternativas

- **>1,000 min/mes:** evaluar Vapi — más control, dashboard para cliente, misma integración ElevenLabs
- **Analytics:** ElevenLabs dashboard muestra historial y duración de conversaciones
- **Backup:** si ElevenLabs cae, el widget no aparece pero el landing sigue funcional; el número Twilio puede redirigirse a voicemail
