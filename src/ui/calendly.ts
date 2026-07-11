// Loads the Cal.com inline embed (replaced Calendly on 2026-07-10: the old
// Calendly account had a broken schedule; Cal.com is now the single source of
// booking, same one Sofía uses for consultarDisponibilidad).
// If the embed fails to load (offline, blocked), the fallback paragraph
// already in the DOM stays visible.
import { trackCalendlyView } from './leadEvents'

const CAL_LINK = 'samuel-garcia-gbsw4p/30min'
const CAL_ORIGIN = 'https://app.cal.com'
const EMBED_SRC = `${CAL_ORIGIN}/embed/embed.js`

type CalApi = {
  (...args: unknown[]): void
  q?: unknown[]
  ns?: Record<string, unknown>
  loaded?: boolean
}

// Stub oficial de Cal.com: crea window.Cal como cola ANTES de cargar embed.js
// (cargar embed.js directo sin el stub no inicializa nada).
function bootstrapCal(): CalApi {
  const w = window as unknown as { Cal?: CalApi }
  if (w.Cal) return w.Cal

  const cal: CalApi = function (...args: unknown[]) {
    const c = w.Cal as CalApi
    if (!c.loaded) {
      c.ns = {}
      c.q = c.q ?? []
      const script = document.createElement('script')
      script.src = EMBED_SRC
      script.async = true
      script.onerror = () => console.warn('[cal.com] embed failed to load; fallback link shown')
      document.head.appendChild(script)
      c.loaded = true
    }
    c.q!.push(args)
  }
  cal.q = []
  w.Cal = cal
  return cal
}

export function initCalendly(): void {
  const container = document.getElementById('calendly')
  if (!container) return

  const Cal = bootstrapCal()
  Cal('init', { origin: CAL_ORIGIN })
  Cal('inline', {
    elementOrSelector: '#calendly',
    calLink: CAL_LINK,
    layout: 'month_view',
  })
  Cal('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view' })
  trackCalendlyView('calendar-inline')
}
