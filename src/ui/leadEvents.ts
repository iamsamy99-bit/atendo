type LeadEvent =
  | 'cta_click'
  | 'calendly_view'
  | 'whatsapp_click'
  | 'phone_click'
  | 'crisp_open'
  | 'callback_submit'

type LeadEventDetail = {
  event: LeadEvent
  source: string
  plan?: string
}

function track(detail: LeadEventDetail): void {
  window.dispatchEvent(new CustomEvent<LeadEventDetail>('atendo:lead-event', { detail }))

  if (window.$crisp) {
    window.$crisp.push(['set', 'session:segments', [['landing', detail.source]]])
    if (detail.plan) window.$crisp.push(['set', 'session:data', [[['plan', detail.plan]]]])
  }
}

export function trackCalendlyView(source = 'landing'): void {
  track({ event: 'calendly_view', source })
}

export function trackCallbackSubmit(source = 'landing'): void {
  track({ event: 'callback_submit', source })
}

export function initLeadEvents(): void {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-lead-event]')
    if (!link) return

    const eventName = link.dataset.leadEvent as LeadEvent | undefined
    if (!eventName) return

    track({
      event: eventName,
      source: link.dataset.leadSource || 'landing',
      plan: link.dataset.plan,
    })

    if (eventName === 'crisp_open') {
      event.preventDefault()
      openChatOrWhatsApp()
    }
  })
}

// Crisp rechaza conexiones desde algunos hosts (p.ej. *.pages.dev responde 451),
// así que si el chat no llega a abrirse caemos a WhatsApp prellenado.
const WHATSAPP_FALLBACK =
  'https://wa.me/523171340304?text=Hola%20Atendo%2C%20vengo%20de%20la%20landing%20y%20quiero%20mas%20informacion.'

function openChatOrWhatsApp(): void {
  // Tras inicializar, l.js reemplaza el array por el cliente real (con .is()).
  const crisp = window.$crisp as any
  if (!crisp || Array.isArray(crisp)) {
    // l.js nunca inicializó (bloqueado/offline): no hay chat posible
    window.open(WHATSAPP_FALLBACK, '_blank', 'noopener')
    return
  }
  crisp.push(['do', 'chat:open'])
  window.setTimeout(() => {
    try {
      if (!(window.$crisp as any).is('chat:opened')) window.open(WHATSAPP_FALLBACK, '_blank', 'noopener')
    } catch {
      window.open(WHATSAPP_FALLBACK, '_blank', 'noopener')
    }
  }, 1200)
}
