// Tarjeta de conversación de la sección "Agentes de voz" — antes era una
// captura estática (aria-hidden, sin animación). Ahora, además de mostrar
// el ejemplo fijo, deja escribir un mensaje real y responde con el mismo
// motor de reglas que el chat del hero (fakeChatEngine).
import { getReply, currentLang } from './fakeChatEngine'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const TYPE_MS = 22

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}

export function initVoiceConvo(): void {
  const msgs = document.getElementById('voice-convo-msgs')
  const form = document.getElementById('voice-convo-form') as HTMLFormElement | null
  const field = document.getElementById('voice-convo-field') as HTMLInputElement | null
  if (!msgs || !form || !field) return

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const sendBtn = form.querySelector<HTMLButtonElement>('.chat-sim__send')

  const addBubble = async (side: 'sent' | 'received', text: string): Promise<void> => {
    const bubble = el('div', `convo-bubble convo-bubble--${side}`)
    const p = document.createElement('p')
    bubble.appendChild(p)
    msgs.appendChild(bubble)
    bubble.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })

    if (side === 'sent' || reduceMotion) {
      p.textContent = text
      return
    }
    for (let i = 1; i <= text.length; i++) {
      p.textContent = text.slice(0, i)
      await sleep(TYPE_MS)
    }
  }

  const showTyping = async (ms: number): Promise<void> => {
    const wrap = el('div', 'convo-bubble convo-bubble--received convo-typing')
    for (let i = 0; i < 3; i++) wrap.appendChild(el('span', 'chat-typing__dot'))
    msgs.appendChild(wrap)
    wrap.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
    await sleep(ms)
    wrap.remove()
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = field.value.trim()
    if (!text) return

    void (async () => {
      field.value = ''
      field.disabled = true
      if (sendBtn) sendBtn.disabled = true

      await addBubble('sent', text)
      await showTyping(600 + Math.random() * 500)
      await addBubble('received', getReply(text, currentLang()))

      field.disabled = false
      if (sendBtn) sendBtn.disabled = false
      field.focus()
    })()
  })
}
