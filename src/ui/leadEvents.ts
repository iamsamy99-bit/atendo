type LeadEvent =
  | 'cta_click'
  | 'calendly_view'
  | 'whatsapp_click'
  | 'phone_click'
  | 'crisp_open'

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
      window.$crisp?.push(['do', 'chat:open'])
    }
  })
}
