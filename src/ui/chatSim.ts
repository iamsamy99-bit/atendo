// Simulador de conversación del agente IA en el hero.
// Loop de ambientación: mensaje del cliente → "escribiendo…" → respuesta
// tecleada por la IA → segundo intercambio → chips de acción → pausa →
// reinicio — hasta que la persona escribe algo de verdad: ahí el widget
// pasa a modo interactivo (para de reiniciarse) y contesta con
// fakeChatEngine según palabras clave, en el idioma activo del sitio.
import { t } from '../i18n/i18n'
import { getReply, currentLang } from './fakeChatEngine'

const TYPE_MS = 26          // velocidad de tecleo de la IA (ms por carácter)
const READ_MS = 900         // pausa "leyendo" antes de escribir
const HOLD_MS = 4200        // conversación completa en pantalla antes de reiniciar
const CHIP_DELAY_MS = 420   // stagger entre chips

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function el(tag: string, cls: string, text = ''): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  if (text) node.textContent = text
  return node
}

export function initChatSim(): void {
  const root = document.getElementById('chat-sim')
  const msgs = document.getElementById('chat-sim-msgs')
  const chips = document.getElementById('chat-sim-chips')
  const form = document.getElementById('chat-sim-form') as HTMLFormElement | null
  const field = document.getElementById('chat-sim-field') as HTMLInputElement | null
  if (!root || !msgs || !chips) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let interactive = false

  const addBubble = async (side: 'user' | 'ai', text: string): Promise<void> => {
    const bubble = el('div', `chat-msg chat-msg--${side}`)
    const p = el('p', '')
    bubble.appendChild(p)
    msgs.appendChild(bubble)
    void bubble.offsetHeight
    bubble.classList.add('chat-msg--in')

    if (side === 'user' || reduceMotion) {
      p.textContent = text
      return
    }
    // Efecto máquina de escribir para la IA
    for (let i = 1; i <= text.length; i++) {
      p.textContent = text.slice(0, i)
      await sleep(TYPE_MS)
    }
  }

  const showTyping = async (ms: number): Promise<void> => {
    const wrap = el('div', 'chat-msg chat-msg--ai chat-typing')
    for (let i = 0; i < 3; i++) wrap.appendChild(el('span', 'chat-typing__dot'))
    msgs.appendChild(wrap)
    void wrap.offsetHeight
    wrap.classList.add('chat-msg--in')
    await sleep(ms)
    wrap.remove()
  }

  // ── Modo interactivo: la persona escribe, el motor de reglas contesta ──
  if (form && field) {
    const sendBtn = form.querySelector<HTMLButtonElement>('.chat-sim__send')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const text = field.value.trim()
      if (!text) return

      void (async () => {
        if (!interactive) {
          interactive = true
          msgs.innerHTML = ''
          chips.classList.remove('chat-sim__chips--in')
          root.classList.remove('chat-sim--done')
        }
        field.value = ''
        field.disabled = true
        if (sendBtn) sendBtn.disabled = true

        await addBubble('user', text)
        await showTyping(600 + Math.random() * 500)
        await addBubble('ai', getReply(text, currentLang()))

        field.disabled = false
        if (sendBtn) sendBtn.disabled = false
        field.focus()
      })()
    })
  }

  if (reduceMotion) {
    // Sin animación: conversación de ejemplo completa y estática, pero el
    // formulario sigue funcionando igual (solo sin el efecto de tecleo).
    for (const [cls, key] of [
      ['user', 'chatsim.u1'], ['ai', 'chatsim.a1'],
      ['user', 'chatsim.u2'], ['ai', 'chatsim.a2'],
    ] as const) {
      const b = el('div', `chat-msg chat-msg--${cls} chat-msg--in`)
      b.appendChild(el('p', '', t(key)))
      msgs.appendChild(b)
    }
    chips.classList.add('chat-sim__chips--in')
    return
  }

  // Pausar el loop cuando el hero no se ve o la pestaña está oculta.
  let visible = true
  new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true }).observe(root)
  const waitVisible = async () => {
    while (!visible || document.hidden) await sleep(500)
  }

  const run = async (): Promise<void> => {
    for (;;) {
      if (interactive) return // la persona ya está usando el chat de verdad
      await waitVisible()
      if (interactive) return
      msgs.innerHTML = ''
      chips.classList.remove('chat-sim__chips--in')
      root.classList.remove('chat-sim--done')

      await sleep(600)
      if (interactive) return
      await addBubble('user', t('chatsim.u1'))
      await showTyping(READ_MS)
      await addBubble('ai', t('chatsim.a1'))
      if (interactive) return
      await sleep(1100)
      await addBubble('user', t('chatsim.u2'))
      await showTyping(READ_MS)
      await addBubble('ai', t('chatsim.a2'))
      if (interactive) return

      // Chips de acción con escala elástica, en cascada
      await sleep(500)
      root.classList.add('chat-sim--done')
      chips.classList.add('chat-sim__chips--in')
      const [c1, c2] = Array.from(chips.children) as HTMLElement[]
      if (c1) c1.style.transitionDelay = '0ms'
      if (c2) c2.style.transitionDelay = `${CHIP_DELAY_MS}ms`

      await sleep(HOLD_MS)
    }
  }

  void run()
}
