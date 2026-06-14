import { setLang, type Lang } from '../i18n/i18n'

// Wires the language toggle button. The button label shows the OTHER language.
export function initNav(current: Lang): void {
  const toggle = document.getElementById('lang-toggle')
  if (!toggle) return

  let lang = current
  const render = () => { toggle.textContent = lang === 'es' ? 'EN' : 'ES' }
  render()

  toggle.addEventListener('click', () => {
    lang = lang === 'es' ? 'en' : 'es'
    setLang(lang)
    render()
  })
}
