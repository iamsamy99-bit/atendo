import { setLang, type Lang } from '../i18n/i18n'

export function initNav(current: Lang): void {
  const toggle = document.getElementById('lang-toggle')
  const nav = document.getElementById('main-nav')

  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

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
