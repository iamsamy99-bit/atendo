// Loads the Calendly inline widget. If it fails to load (offline, blocked),
// the fallback paragraph already in the DOM stays visible.
const CALENDLY_URL = 'https://calendly.com/iamsamy99/30min' // Calendly real de Samuel

export function initCalendly(): void {
  const container = document.getElementById('calendly')
  if (!container) return

  const script = document.createElement('script')
  script.src = 'https://assets.calendly.com/assets/external/widget.js'
  script.async = true
  script.onload = () => {
    // @ts-expect-error Calendly is injected globally by the widget script
    if (window.Calendly) {
      // @ts-expect-error global
      window.Calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container })
    }
  }
  script.onerror = () => {
    console.warn('[calendly] widget failed to load; fallback link shown')
  }
  document.head.appendChild(script)
}
