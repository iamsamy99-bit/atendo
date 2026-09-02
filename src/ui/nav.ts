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

  // Scrollspy: resalta el link del nav cuya sección cruza la franja superior del viewport
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__links a[href^="#"]'))
  const sections = links
    .map((l) => document.querySelector<HTMLElement>(l.hash))
    .filter((s): s is HTMLElement => s !== null)
  if (sections.length && 'IntersectionObserver' in window) {
    const setActive = (id: string | null) => {
      links.forEach((l) => l.classList.toggle('active', id !== null && l.hash === `#${id}`))
    }
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
        // por encima de la primera sección (hero) no hay sección activa
        if (window.scrollY < sections[0].offsetTop - window.innerHeight * 0.4) setActive(null)
      },
      { rootMargin: '-25% 0px -65% 0px' }
    )
    sections.forEach((s) => spy.observe(s))
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
