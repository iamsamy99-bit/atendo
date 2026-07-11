// Simulador de conversación del agente IA en el hero.
// Loop: mensaje del cliente → "escribiendo…" → respuesta tecleada por la IA →
// segundo intercambio → chips de acción con rebote elástico → pausa → reinicio.
// Todo con transform/opacity (GPU). Se pausa fuera del viewport y respeta
// prefers-reduced-motion (muestra la conversación completa, sin loop).
import { t } from '../i18n/i18n'

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
  if (!root || !msgs || !chips) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduceMotion) {
    // Sin animación: conversación completa, estática.
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

  const addBubble = async (side: 'user' | 'ai', text: string): Promise<void> => {
    const bubble = el('div', `chat-msg chat-msg--${side}`)
    const p = el('p', '')
    bubble.appendChild(p)
    msgs.appendChild(bubble)
    // reflow para que la transición de entrada corra
    void bubble.offsetHeight
    bubble.classList.add('chat-msg--in')

    if (side === 'user') {
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

  const run = async (): Promise<void> => {
    for (;;) {
      await waitVisible()
      msgs.innerHTML = ''
      chips.classList.remove('chat-sim__chips--in')
      root.classList.remove('chat-sim--done')

      await sleep(600)
      await addBubble('user', t('chatsim.u1'))
      await showTyping(READ_MS)
      await addBubble('ai', t('chatsim.a1'))
      await sleep(1100)
      await addBubble('user', t('chatsim.u2'))
      await showTyping(READ_MS)
      await addBubble('ai', t('chatsim.a2'))

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
