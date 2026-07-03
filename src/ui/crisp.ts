declare global {
  interface Window {
    $crisp: any[]
    CRISP_WEBSITE_ID: string
  }
}

const CRISP_WEBSITE_ID = '9309117c-d9c4-47c4-9ebb-8885ed1afdd4'

export function initCrisp(lang: string): void {
  window.$crisp = window.$crisp || []
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID

  // Locale inicial — Crisp acepta 'es' y 'en'
  window.$crisp.push(['config', 'locale', [lang]])

  // Etiqueta de origen para filtrar en el inbox
  window.$crisp.push(['set', 'session:segments', [['landing', 'voice-demo']]])

  const script = document.createElement('script')
  script.src = 'https://client.crisp.chat/l.js'
  script.async = true
  document.head.appendChild(script)

  // Sincroniza locale cada vez que applyTranslations cambia el lang del doc
  const observer = new MutationObserver(() => {
    const newLang = document.documentElement.lang
    if (newLang) window.$crisp.push(['config', 'locale', [newLang]])
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  })
}
