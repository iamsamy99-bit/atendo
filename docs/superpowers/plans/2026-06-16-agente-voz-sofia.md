# Agente de Voz Sofía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar a Sofía, agente de voz bilingüe IA, en el landing de Atendo — accesible desde widget web y número de teléfono US.

**Architecture:** ElevenLabs Conversational AI como plataforma única (STT + TTS + LLM routing), conectada a OpenAI GPT-4o-mini como cerebro y a Twilio para telefonía. Un solo `agent-id` sirve para web widget y para llamadas telefónicas. El widget se inyecta desde `VoiceWidget.ts` siguiendo el mismo patrón de `calendly.ts`.

**Tech Stack:** ElevenLabs Conversational AI, OpenAI GPT-4o-mini, Twilio, Vite + TypeScript vanilla, Vitest

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `docs/agent-prompt.md` | Crear | System prompt completo de Sofía (editable por cliente) |
| `docs/guia-agente-voz.md` | Crear | Guía paso a paso para replicar el setup con cualquier cliente |
| `.env.example` | Crear | Documenta VITE_ELEVENLABS_AGENT_ID |
| `src/components/VoiceWidget.ts` | Crear | Inyecta el Web Component de ElevenLabs; expone `initVoiceWidget` e `openVoiceWidget` |
| `src/i18n/es.json` | Modificar | Añadir claves `hero.cta_demo` y `widget.tooltip` |
| `src/i18n/en.json` | Modificar | Ídem en inglés |
| `src/styles/components.css` | Modificar | Ajustar `.wa-float` y `.tg-float` para no chocar con widget EL |
| `index.html` | Modificar | Botón CTA demo en Hero; `<elevenlabs-convai>` al final del `<body>` |
| `src/main.ts` | Modificar | Llamar a `initVoiceWidget` con la env var |
| `tests/voice-widget.test.ts` | Crear | Tests de `initVoiceWidget` y `openVoiceWidget` |

---

## Task 1 (MANUAL): Crear agente Sofía en ElevenLabs

> Esta tarea no tiene código — es configuración en el dashboard. Al final obtienes el `agent-id` que necesitan todos los demás tasks.

- [ ] **Paso 1: Ir al dashboard de ElevenLabs Conversational AI**

  URL: https://elevenlabs.io/app/conversational-ai → clic en **"New agent"**

- [ ] **Paso 2: Configurar el agente**

  | Campo | Valor |
  |-------|-------|
  | Agent name | `Sofía — Atendo` |
  | First message | `Hola, soy Sofía de Atendo. ¿En qué puedo ayudarte hoy? / Hi, I'm Sofía from Atendo. How can I help you today?` |
  | System prompt | *(pegar el contenido de `docs/agent-prompt.md` que creas en Task 2)* |
  | LLM | Custom LLM → seleccionar **OpenAI** → modelo `gpt-4o-mini` → pegar tu OpenAI API key |
  | Voice | Buscar voz en español mexicano (recomendado: "Valentina" o "Lucia" si están disponibles; cualquier voz ES-MX femenina natural) |
  | Language | `es` (el prompt maneja el switch a inglés) |

- [ ] **Paso 3: Guardar y copiar el Agent ID**

  Aparece en la URL: `https://elevenlabs.io/app/conversational-ai/AGENT_ID_AQUI`
  Guárdalo — lo necesitas en `.env.local` en Task 3.

- [ ] **Paso 4: Probar en el playground de ElevenLabs**

  Clic en **"Test"** dentro del dashboard. Verificar que:
  - Responde en español si hablas español
  - Cambia a inglés si hablas inglés
  - Activa modo Clínica Dental Vista si dices "hazme un demo"
  - Regresa al modo Atendo cuando dices "gracias"

---

## Task 2: Escribir el system prompt (`docs/agent-prompt.md`)

**Files:**
- Crear: `docs/agent-prompt.md`

- [ ] **Paso 1: Crear el archivo**

  ```markdown
  # System Prompt — Sofía (Atendo)
  
  > Para adaptar a un nuevo cliente: modifica los bloques [MODO ATENDO] y [MODO DEMO].
  
  [IDENTIDAD]
  Eres Sofía, la asistente de voz de Atendo. Atendo es una agencia especializada en
  crear agentes de voz con inteligencia artificial y sitios web para negocios en México
  y Estados Unidos. Tu tono es profesional, cálido y directo. Máximo 2-3 oraciones
  por respuesta.
  
  You are Sofía, Atendo's voice assistant. Atendo is an agency that builds AI voice
  agents and websites for businesses in Mexico and the United States. Your tone is
  professional, warm, and direct. Maximum 2-3 sentences per response.
  
  [IDIOMA]
  Detecta el idioma del PRIMER mensaje del usuario. Si empieza en español, responde
  siempre en español. Si empieza en inglés, responde siempre en inglés. No cambies
  de idioma a menos que el usuario te lo pida explícitamente.
  
  [MODO ATENDO — DEFAULT]
  Eres la recepcionista de ventas de Atendo. Tus objetivos en orden:
  1. Saludar brevemente y preguntar en qué puedes ayudar.
  2. Responder preguntas sobre los servicios de Atendo.
  3. Calificar al prospecto: ¿tiene un negocio propio? ¿recibe llamadas de clientes?
  4. Si hay interés real, invitar a agendar una demo gratuita:
     https://calendly.com/iamsamy99/30min
  
  Servicios de Atendo:
  - Agentes de voz con IA: atienden llamadas 24/7, dan información, agendan citas
    automáticamente, hablan español e inglés.
  - Sitios web modernos: páginas rápidas optimizadas para conversión, listas para
    conectarse con el agente de voz.
  
  Planes (menciona solo si el usuario pregunta por precios):
  - Esencial: $4,900 MXN/mes · $497 USD/mes — 1 agente, hasta 300 min/mes
  - Negocio: $9,900 MXN/mes · $997 USD/mes — 1 agente, hasta 1,000 min/mes
  - Empresa: $24,900 MXN/mes · $2,497 USD/mes — varios agentes, minutos a la medida
  
  [TRIGGER DE DEMO]
  Activa el MODO DEMO si el usuario dice alguna de estas frases:
  - ES: "muéstrame cómo funciona", "hazme un demo", "quiero ver un ejemplo"
  - EN: "show me a demo", "show me how it works", "give me an example"
  
  [MODO DEMO — Clínica Dental Vista]
  Al activarse, anunciar:
  - ES: "¡Perfecto! Te muestro cómo funciona para una clínica dental.
    Desde ahora soy la recepcionista de Clínica Dental Vista..."
  - EN: "Perfect! Let me show you how it works for a dental clinic.
    I'll now be the receptionist at Clínica Dental Vista..."
  
  Rol en modo demo:
  - Negocio: Clínica Dental Vista
  - Horario: lunes a viernes 9:00–18:00, sábados 9:00–14:00
  - Servicios: limpieza, ortodoncia, blanqueamiento, examen general, urgencias
  - Acciones: confirmar/agendar citas (pedir nombre y motivo), informar horarios,
    derivar urgencias con "Tenemos espacio hoy, le recomiendo venir lo antes posible."
  
  [SALIDA DEL DEMO]
  Activar salida si el usuario dice: "gracias", "listo", "ya vi", "exit demo", "salir".
  
  Al salir:
  - ES: "¡Y así es como funciona Atendo! ¿Tienes alguna pregunta sobre cómo podríamos
    hacer algo así para tu negocio?"
  - EN: "And that's how Atendo works! Do you have any questions about how we could
    do something like this for your business?"
  Volver al MODO ATENDO.
  
  [LÍMITES]
  - No inventes precios distintos a los listados.
  - No prometas tiempos de entrega más allá de "pocos días tras la demo".
  - No garantices resultados de negocio.
  - Si no sabes algo: "Para esa pregunta te puedo conectar con Samuel de nuestro equipo."
  - No menciones que eres IA a menos que el usuario lo pregunte directamente.
  ```

- [ ] **Paso 2: Commitear**

  ```bash
  git add docs/agent-prompt.md
  git commit -m "docs: add Sofia system prompt"
  ```

---

## Task 3: Variables de entorno (`.env.example`)

**Files:**
- Crear: `.env.example`

- [ ] **Paso 1: Crear `.env.example`**

  ```env
  # ElevenLabs Conversational AI
  # Obtén el agent-id en: https://elevenlabs.io/app/conversational-ai
  VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
  ```

- [ ] **Paso 2: Crear `.env.local` con tu agent-id real (no se commitea)**

  ```env
  VITE_ELEVENLABS_AGENT_ID=TU_AGENT_ID_REAL_AQUI
  ```

  Verificar que `.gitignore` tiene `.env.local` (Vite lo incluye por defecto).

- [ ] **Paso 3: Commitear**

  ```bash
  git add .env.example
  git commit -m "chore: add VITE_ELEVENLABS_AGENT_ID to env example"
  ```

---

## Task 4 (TDD): Claves i18n para el widget

El test en `tests/i18n.test.ts` verifica que ambos diccionarios tienen claves idénticas — añadir una clave en un solo archivo fallará el test automáticamente.

**Files:**
- Modificar: `src/i18n/es.json`
- Modificar: `src/i18n/en.json`

- [ ] **Paso 1: Correr el test existente para confirmar que pasa**

  ```bash
  npx vitest run tests/i18n.test.ts
  ```
  Expected: PASS

- [ ] **Paso 2: Añadir claves en `src/i18n/es.json`**

  Antes del `}` final, añadir:

  ```json
  "hero.cta_demo": "Prueba el agente en vivo →",
  "widget.tooltip": "Habla con Sofía"
  ```

- [ ] **Paso 3: Añadir claves en `src/i18n/en.json`**

  Antes del `}` final, añadir:

  ```json
  "hero.cta_demo": "Try the live agent →",
  "widget.tooltip": "Talk to Sofía"
  ```

- [ ] **Paso 4: Correr el test para confirmar que sigue pasando**

  ```bash
  npx vitest run tests/i18n.test.ts
  ```
  Expected: PASS

- [ ] **Paso 5: Commitear**

  ```bash
  git add src/i18n/es.json src/i18n/en.json
  git commit -m "feat(i18n): add voice widget keys"
  ```

---

## Task 5 (TDD): `src/components/VoiceWidget.ts`

**Files:**
- Crear: `tests/voice-widget.test.ts`
- Crear: `src/components/VoiceWidget.ts`

- [ ] **Paso 1: Escribir el test en `tests/voice-widget.test.ts`**

  ```typescript
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { initVoiceWidget, openVoiceWidget } from '../src/components/VoiceWidget'

  describe('initVoiceWidget', () => {
    beforeEach(() => {
      document.head.innerHTML = ''
      document.body.innerHTML = ''
    })

    it('does nothing when agentId is empty string', () => {
      initVoiceWidget('')
      expect(document.head.querySelector('script')).toBeNull()
      expect(document.body.querySelector('elevenlabs-convai')).toBeNull()
    })

    it('injects the ElevenLabs script into <head>', () => {
      initVoiceWidget('agent-abc')
      const script = document.head.querySelector('script') as HTMLScriptElement
      expect(script).not.toBeNull()
      expect(script.src).toContain('elevenlabs.io/convai-widget')
      expect(script.async).toBe(true)
    })

    it('appends <elevenlabs-convai> to <body> with correct agent-id', () => {
      initVoiceWidget('agent-abc')
      const widget = document.body.querySelector('elevenlabs-convai')
      expect(widget).not.toBeNull()
      expect(widget!.getAttribute('agent-id')).toBe('agent-abc')
    })

    it('does not inject a duplicate script on second call', () => {
      initVoiceWidget('agent-abc')
      initVoiceWidget('agent-abc')
      const scripts = document.head.querySelectorAll('script')
      expect(scripts.length).toBe(1)
    })
  })

  describe('openVoiceWidget', () => {
    it('calls open() on the elevenlabs-convai element when it exists', () => {
      document.body.innerHTML = '<elevenlabs-convai></elevenlabs-convai>'
      const widget = document.body.querySelector('elevenlabs-convai') as HTMLElement & { open?: () => void }
      widget.open = vi.fn()
      openVoiceWidget()
      expect(widget.open).toHaveBeenCalled()
    })

    it('does not throw when elevenlabs-convai is absent from the DOM', () => {
      document.body.innerHTML = ''
      expect(() => openVoiceWidget()).not.toThrow()
    })
  })
  ```

- [ ] **Paso 2: Correr el test para verificar que falla (archivo aún no existe)**

  ```bash
  npx vitest run tests/voice-widget.test.ts
  ```
  Expected: FAIL con `Cannot find module '../src/components/VoiceWidget'`

- [ ] **Paso 3: Crear `src/components/VoiceWidget.ts`**

  ```typescript
  const ELEVENLABS_SCRIPT_SRC = 'https://elevenlabs.io/convai-widget/index.js'

  export function initVoiceWidget(agentId: string): void {
    if (!agentId) return
    if (document.querySelector(`script[src="${ELEVENLABS_SCRIPT_SRC}"]`)) return

    const script = document.createElement('script')
    script.src = ELEVENLABS_SCRIPT_SRC
    script.async = true
    document.head.appendChild(script)

    const widget = document.createElement('elevenlabs-convai')
    widget.setAttribute('agent-id', agentId)
    document.body.appendChild(widget)
  }

  export function openVoiceWidget(): void {
    const widget = document.querySelector('elevenlabs-convai') as HTMLElement & { open?: () => void }
    widget?.open?.()
  }
  ```

- [ ] **Paso 4: Correr el test para verificar que pasa**

  ```bash
  npx vitest run tests/voice-widget.test.ts
  ```
  Expected: PASS (6 tests)

- [ ] **Paso 5: Correr todos los tests para verificar sin regresiones**

  ```bash
  npx vitest run
  ```
  Expected: PASS (todos)

- [ ] **Paso 6: Commitear**

  ```bash
  git add src/components/VoiceWidget.ts tests/voice-widget.test.ts
  git commit -m "feat: add VoiceWidget with initVoiceWidget and openVoiceWidget"
  ```

---

## Task 6: CSS — ajustar posiciones de botones flotantes

El widget de ElevenLabs renderiza en `bottom: 18px, right: 18px` por defecto. Los botones `.wa-float` y `.tg-float` actuales están en esa misma zona y quedarían encimados.

**Files:**
- Modificar: `src/styles/components.css`

- [ ] **Paso 1: Reemplazar `.wa-float` y `.tg-float` en `src/styles/components.css`**

  Reemplazar el bloque completo de `.wa-float` y `.tg-float` con:

  ```css
  .wa-float {
    position: fixed; right: 18px; bottom: 82px; z-index: 50;
    background: #25D366; color: #fff; font-weight: 700;
    padding: 0.7rem 1.1rem; border-radius: 999px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    animation: slideInRight 0.45s 0.6s ease both;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .wa-float:hover { background: #1ebe5b; transform: scale(1.06); }
  .tg-float {
    position: fixed; right: 18px; bottom: 146px; z-index: 50;
    background: #229ED9; color: #fff; font-weight: 700;
    padding: 0.7rem 1.1rem; border-radius: 999px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    animation: slideInRight 0.45s 0.72s ease both;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .tg-float:hover { background: #1a8bbf; transform: scale(1.06); }
  ```

  *(Cambia son: `.wa-float` de `bottom: 18px` a `bottom: 82px`; `.tg-float` de `bottom: 76px` a `bottom: 146px`)*

- [ ] **Paso 2: Verificar en dev server**

  ```bash
  npm run dev
  ```
  Abrir http://localhost:5173 → confirmar que WA y Telegram están más arriba y no se superponen.

- [ ] **Paso 3: Commitear**

  ```bash
  git add src/styles/components.css
  git commit -m "fix(css): move wa-float and tg-float up to make room for voice widget"
  ```

---

## Task 7: Actualizar `index.html`

**Files:**
- Modificar: `index.html`

- [ ] **Paso 1: Añadir botón CTA demo en el Hero**

  En `index.html`, después de la línea 30:
  ```html
  <a href="#book" class="btn btn--primary btn--lg" data-i18n="hero.cta"></a>
  ```
  Añadir:
  ```html
  <button id="voice-cta" class="btn btn--outline btn--lg" data-i18n="hero.cta_demo" type="button"></button>
  ```

- [ ] **Paso 2: Añadir `<elevenlabs-convai>` al final del `<body>`**

  Justo antes de `</body>` (después de las líneas de `.tg-float` y `.wa-float`), añadir:
  ```html
  <elevenlabs-convai id="sofia-widget"></elevenlabs-convai>
  ```

  El bloque final del `<body>` queda:
  ```html
    <script type="module" src="/src/main.ts"></script>
    <a class="tg-float" href="https://t.me/Atendo_service_bot" target="_blank" rel="noopener" aria-label="Telegram">✈ Telegram</a>
    <a class="wa-float" href="https://wa.me/523171340304" target="_blank" rel="noopener" aria-label="WhatsApp">💬 WhatsApp</a>
    <elevenlabs-convai id="sofia-widget"></elevenlabs-convai>
  </body>
  ```

  > El `agent-id` lo asigna `VoiceWidget.ts` en runtime desde la env var — no se hardcodea en HTML.

- [ ] **Paso 3: Commitear**

  ```bash
  git add index.html
  git commit -m "feat(html): add voice CTA in hero and elevenlabs-convai element"
  ```

---

## Task 8: Actualizar `src/main.ts`

**Files:**
- Modificar: `src/main.ts`

- [ ] **Paso 1: Reemplazar el contenido completo de `src/main.ts`**

  ```typescript
  import './styles/base.css'
  import './styles/layout.css'
  import './styles/components.css'
  import { getInitialLang, applyTranslations } from './i18n/i18n'
  import { initNav } from './ui/nav'
  import { initCalendly } from './ui/calendly'
  import { initAnimations } from './ui/animations'
  import { initVoiceWidget, openVoiceWidget } from './components/VoiceWidget'

  const lang = getInitialLang()
  applyTranslations(lang)
  initNav(lang)
  initCalendly()
  initAnimations()
  initVoiceWidget(import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? '')

  document.getElementById('voice-cta')?.addEventListener('click', () => {
    openVoiceWidget()
  })
  ```

- [ ] **Paso 2: Correr todos los tests**

  ```bash
  npx vitest run
  ```
  Expected: PASS (todos)

- [ ] **Paso 3: Verificar en dev server**

  ```bash
  npm run dev
  ```
  Verificar:
  - Botón "Prueba el agente en vivo →" aparece en el Hero (en español) y "Try the live agent →" al cambiar a EN
  - El widget de ElevenLabs aparece en la esquina inferior derecha
  - Hacer clic en el botón Hero activa el widget (abre el panel de conversación)
  - WA y Telegram están más arriba, sin chocar

- [ ] **Paso 4: Commitear**

  ```bash
  git add src/main.ts
  git commit -m "feat: wire up VoiceWidget in main — hero CTA opens Sofia"
  ```

---

## Task 9 (MANUAL): Setup Twilio + conexión a ElevenLabs

> No tiene código. Al terminar, el número US queda conectado al mismo agente Sofía del widget web.

**Pre-requisito:** Agent ID de ElevenLabs (Task 1 completada).

- [ ] **Paso 1: Crear cuenta Twilio**

  URL: https://twilio.com → Sign up (free trial ~$15 USD de crédito incluido)

- [ ] **Paso 2: Comprar número US (+1)**

  En la consola Twilio: **Phone Numbers → Manage → Buy a number**
  - País: United States, tipo: Local
  - Costo: ~$1.15/mes (se descuenta del trial credit)
  - Copiar el número comprado

- [ ] **Paso 3: Anotar credenciales de Twilio**

  En la homepage de la consola Twilio:
  - **Account SID** (empieza con `AC...`)
  - **Auth Token** (clic en el ojo para verlo)

- [ ] **Paso 4: Conectar el número a ElevenLabs**

  En el dashboard del agente Sofía → pestaña **"Phone numbers"**:
  1. Clic en **"Add phone number"** → **Twilio**
  2. Ingresar Account SID + Auth Token + número comprado
  3. Clic en **"Import"**
  4. ElevenLabs configura el webhook en Twilio automáticamente (no se requiere código)

- [ ] **Paso 5: Verificar la llamada**

  Llamar al número desde tu celular. Sofía debe:
  - Contestar en ~3 segundos
  - Saludar en español si hablas español
  - Cambiar a inglés si hablas inglés
  - Activar el demo dental al decir "hazme un demo"

---

## Task 10: Guía replicable (`docs/guia-agente-voz.md`)

**Files:**
- Crear: `docs/guia-agente-voz.md`

- [ ] **Paso 1: Crear el archivo**

  ```markdown
  # Guía: Cómo Desplegar un Agente de Voz IA — Stack Atendo
  
  > Proceso completo para crear e integrar un agente de voz bilingüe (ES/EN).
  > Tiempo: 2–4 horas la primera vez, ~1 hora en deployments subsiguientes.
  
  ## 1. Cuentas necesarias
  
  | Servicio | Plan mínimo | Costo |
  |----------|-------------|-------|
  | ElevenLabs | Free (10 min/mes) | $0 |
  | OpenAI | Pay-as-you-go | ~$0.001/1K tokens |
  | Twilio | Trial | $0 (~$15 USD de crédito incluido) |
  
  ## 2. Crear el agente en ElevenLabs
  
  1. Ir a https://elevenlabs.io/app/conversational-ai → **"New agent"**
  2. Configurar:
     - **Agent name:** `Nombre del Negocio — Recepcionista`
     - **First message:** saludo inicial del agente
     - **System prompt:** copiar y adaptar `docs/agent-prompt.md` de este repo
     - **LLM:** Custom → OpenAI → `gpt-4o-mini` → pegar OpenAI API key
     - **Voice:** elegir voz en el idioma del cliente
  3. Guardar y copiar el **Agent ID** desde la URL
  
  ### Elegir la voz
  - ES-MX: buscar voces con etiqueta "Spanish (Mexico)" o "es-MX"
  - Probar 2-3 voces en el playground antes de decidir
  
  ## 3. Obtener número de teléfono con Twilio
  
  1. Crear cuenta en https://twilio.com
  2. **Phone Numbers → Manage → Buy a number**
     - US (+1): listo en 2 minutos, sin trámites
     - MX (+52): requiere IFT Regulatory Bundle (3-5 días hábiles)
  3. Anotar: número, Account SID, Auth Token
  
  ### Conectar Twilio a ElevenLabs
  1. Dashboard del agente → **"Phone numbers"** → **"Add phone number"** → Twilio
  2. Ingresar Account SID + Auth Token + número
  3. Clic **"Import"** — webhook configurado automáticamente
  4. Verificar llamando al número
  
  ## 4. Integrar el widget en el sitio web
  
  ### HTML estático / cualquier CMS
  ```html
  <script src="https://elevenlabs.io/convai-widget/index.js" async></script>
  <elevenlabs-convai agent-id="TU_AGENT_ID"></elevenlabs-convai>
  ```
  
  ### Vite + TypeScript (patrón de este repo)
  1. Añadir `VITE_ELEVENLABS_AGENT_ID=TU_AGENT_ID` a `.env.local`
  2. Copiar `src/components/VoiceWidget.ts` de este repo
  3. En `src/main.ts`:
  ```typescript
  import { initVoiceWidget, openVoiceWidget } from './components/VoiceWidget'
  initVoiceWidget(import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? '')
  ```
  4. Ajustar posición de botones flotantes existentes (ver Task 6 de este plan)
  
  ### WordPress
  1. **Apariencia → Editor de temas → footer.php** — añadir antes de `</body>`
  2. Alternativa: plugin "Insert Headers and Footers"
  
  ## 5. Personalizar para un nuevo cliente
  
  | Bloque del prompt | Qué editar |
  |-------------------|------------|
  | `[IDENTIDAD]` | Nombre del agente y del negocio |
  | `[MODO ATENDO]` | Servicios, precios, acciones del negocio |
  | `[MODO DEMO]` | Eliminar (era solo para Atendo) |
  | `[LÍMITES]` | Restricciones específicas del cliente |
  
  Para clonar el agente: tres puntos en el dashboard → **"Duplicate"**.
  
  ## 6. Checklist de lanzamiento
  
  - [ ] Agente responde en el idioma correcto desde el primer mensaje
  - [ ] Primer mensaje suena natural y menciona el negocio
  - [ ] Responde preguntas clave correctamente
  - [ ] No inventa información fuera del system prompt
  - [ ] Widget se ve bien en móvil
  - [ ] Número de teléfono contesta en <5 segundos
  - [ ] Probado desde número diferente al de prueba
  
  ## 7. Costos reales y márgenes
  
  | Minutos/mes | ElevenLabs | Twilio llamadas | Twilio número | OpenAI | **Total** |
  |-------------|------------|-----------------|---------------|--------|-----------|
  | 10 (free) | $0 | ~$0.85 | $1.15 | ~$0.50 | **~$2.50** |
  | 50 | $3.20 | ~$4.25 | $1.15 | ~$1.50 | **~$10** |
  | 300 | $19.20 | ~$25.50 | $1.15 | ~$5 | **~$51** |
  | 1,000 | $64 | ~$85 | $1.15 | ~$15 | **~$165** |
  
  *ElevenLabs: $0.08/min sobre los 10 free. Twilio: ~$0.0085/min inbound.*
  
  | Plan Atendo | Costo real ~300 min | Precio cliente | Margen |
  |-------------|---------------------|----------------|--------|
  | Esencial | ~$51/mes | $497 USD/mes | ~90% |
  | Negocio | ~$165/mes | $997 USD/mes | ~83% |
  | Empresa | ~$165+/mes | $2,497 USD/mes | >90% |
  
  ## Notas
  
  - **Número MX (+52):** alternativa más simple = el cliente desvía su número
    existente de Telmex/Telcel al número Twilio US.
  - **Escalado >1,000 min/mes:** evaluar Vapi (más control, misma integración ElevenLabs).
  - **Backup:** si ElevenLabs cae, el widget simplemente no aparece — el landing sigue funcional.
  ```

- [ ] **Paso 2: Commitear**

  ```bash
  git add docs/guia-agente-voz.md
  git commit -m "docs: add complete voice agent replication guide"
  ```

---

## Task 11: Build de producción y deploy a Netlify

**Files:**
- Configuración en Netlify dashboard (no código)

- [ ] **Paso 1: Build de producción**

  ```bash
  npm run build
  ```
  Expected: `dist/` generado sin errores ni warnings de TypeScript.

- [ ] **Paso 2: Configurar variable de entorno en Netlify**

  Dashboard de Netlify → **Site settings → Environment variables → Add variable**:
  - Key: `VITE_ELEVENLABS_AGENT_ID`
  - Value: tu agent-id real de ElevenLabs

- [ ] **Paso 3: Deploy**

  Arrastrar la carpeta `dist/` al dashboard de Netlify (como se hace actualmente).

- [ ] **Paso 4: Verificar en producción**

  Abrir https://atendoproyectvoicevoip.netlify.app y verificar:
  - Botón "Prueba el agente en vivo →" aparece en el Hero en ambos idiomas
  - Widget de ElevenLabs aparece en esquina inferior derecha
  - WA y Telegram están más arriba sin superposición
  - Clic en el botón Hero abre el widget
  - Conversación funciona (el navegador pedirá permiso de micrófono)

- [ ] **Paso 5: Commit final si hubo ajustes**

  ```bash
  git add -A
  git commit -m "feat: Sofia voice agent fully integrated — web widget + phone"
  ```

---

## Resultado al terminar

- Sofía activa desde el widget web del landing y desde el número Twilio US
- Botón "Prueba el agente en vivo →" en el Hero abre el widget directamente
- `docs/agent-prompt.md` — system prompt editable y reusable con cualquier cliente
- `docs/guia-agente-voz.md` — guía completa para replicar el setup en <1 hora
- `src/components/VoiceWidget.ts` — componente limpio, testeado, con 6 tests pasando
- Todos los tests del proyecto pasan sin regresiones
