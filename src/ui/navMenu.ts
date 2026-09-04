/**
 * Navegación del sitio: menús desplegables en escritorio y menú completo en
 * móvil.
 *
 * Antes de esto, por debajo de 640px el nav no mostraba NINGÚN link y no había
 * hamburguesa: en móvil el sitio se quedaba sin navegación. Y las 9 páginas de
 * servicios e industrias solo eran alcanzables desde las tarjetas del home.
 *
 * Decisiones que vienen de las reglas de UX, no del gusto:
 *  - Los desplegables abren con CLIC, no solo con hover: en táctil el hover no
 *    existe y un menú hover-only es inalcanzable con el dedo.
 *  - Escape cierra y devuelve el foco al disparador; clic fuera también cierra.
 *  - Flechas arriba/abajo recorren las opciones del menú abierto.
 *  - `aria-expanded` y `aria-controls` para que un lector de pantalla sepa el
 *    estado real del menú.
 *  - La página actual se marca con aria-current para no perder la orientación.
 */

const BREAKPOINT_MOVIL = 860

export function initNavMenu(): void {
  const nav = document.getElementById('main-nav')
  if (!nav) return

  const toggle = nav.querySelector<HTMLButtonElement>('#nav-toggle')
  const panel = nav.querySelector<HTMLElement>('#nav-menu')
  const triggers = Array.from(nav.querySelectorAll<HTMLButtonElement>('.nav__trigger'))

  const esMovil = () => window.innerWidth <= BREAKPOINT_MOVIL

  // ── Submenús ────────────────────────────────────────────────────────
  const cerrarSubmenus = (excepto?: HTMLButtonElement) => {
    triggers.forEach((t) => {
      if (t === excepto) return
      const menu = document.getElementById(t.getAttribute('aria-controls') || '')
      t.setAttribute('aria-expanded', 'false')
      if (menu) menu.hidden = true
    })
  }

  const abrirSubmenu = (t: HTMLButtonElement, abrir: boolean) => {
    const menu = document.getElementById(t.getAttribute('aria-controls') || '')
    if (!menu) return
    if (abrir) cerrarSubmenus(t)
    t.setAttribute('aria-expanded', String(abrir))
    menu.hidden = !abrir
  }

  // El hover abre el menú en escritorio, pero entonces el clic sobre el mismo
  // disparador lo cerraba de inmediato (el puntero entra → abre → el clic
  // alterna → cierra). Se marca cuándo lo abrió el hover para que el primer
  // clic lo respete y no lo cierre.
  const abiertoPorHover = new WeakSet<HTMLButtonElement>()

  triggers.forEach((t) => {
    t.addEventListener('click', (e) => {
      e.stopPropagation()
      if (abiertoPorHover.has(t)) { abiertoPorHover.delete(t); return }
      abrirSubmenu(t, t.getAttribute('aria-expanded') !== 'true')
    })

    // En escritorio se abre también al pasar el cursor, pero como MEJORA:
    // el clic sigue siendo la vía principal y la única en táctil.
    const contenedor = t.closest<HTMLElement>('.nav__item')
    if (contenedor) {
      contenedor.addEventListener('mouseenter', () => {
        if (esMovil() || !window.matchMedia('(hover: hover)').matches) return
        if (t.getAttribute('aria-expanded') !== 'true') abiertoPorHover.add(t)
        abrirSubmenu(t, true)
      })
      contenedor.addEventListener('mouseleave', () => {
        if (esMovil() || !window.matchMedia('(hover: hover)').matches) return
        abiertoPorHover.delete(t)
        abrirSubmenu(t, false)
      })
    }

    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        abrirSubmenu(t, true)
        const menu = document.getElementById(t.getAttribute('aria-controls') || '')
        menu?.querySelector<HTMLAnchorElement>('a')?.focus()
      }
    })
  })

  // Flechas dentro de un submenú abierto
  nav.querySelectorAll<HTMLElement>('.nav__menu').forEach((menu) => {
    menu.addEventListener('keydown', (e) => {
      const items = Array.from(menu.querySelectorAll<HTMLAnchorElement>('a'))
      const i = items.indexOf(document.activeElement as HTMLAnchorElement)
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    })
  })

  // ── Menú móvil ──────────────────────────────────────────────────────
  const abrirMovil = (abrir: boolean) => {
    if (!toggle || !panel) return
    toggle.setAttribute('aria-expanded', String(abrir))
    nav.classList.toggle('nav--abierto', abrir)
    // El scroll del fondo se bloquea solo en móvil, donde el panel ocupa
    // toda la pantalla; en escritorio el menú no tapa nada.
    document.body.style.overflow = abrir && esMovil() ? 'hidden' : ''
    if (!abrir) cerrarSubmenus()
  }

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation()
    abrirMovil(toggle.getAttribute('aria-expanded') !== 'true')
  })

  // Al elegir un destino se cierra todo: en móvil el panel se quedaba encima.
  panel?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => { abrirMovil(false); cerrarSubmenus() })
  })

  // ── Cierres globales ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target as Node)) { cerrarSubmenus(); abrirMovil(false) }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const abierto = triggers.find((t) => t.getAttribute('aria-expanded') === 'true')
    if (abierto) {
      abrirSubmenu(abierto, false)
      abierto.focus() // devolver el foco: si no, se pierde al final del documento
      return
    }
    if (toggle?.getAttribute('aria-expanded') === 'true') {
      abrirMovil(false)
      toggle.focus()
    }
  })

  // Al pasar de móvil a escritorio hay que limpiar el estado o el body queda
  // bloqueado con un panel que ya no se ve.
  let anchoPrevio = window.innerWidth
  window.addEventListener('resize', () => {
    if ((anchoPrevio <= BREAKPOINT_MOVIL) !== (window.innerWidth <= BREAKPOINT_MOVIL)) {
      abrirMovil(false)
      cerrarSubmenus()
    }
    anchoPrevio = window.innerWidth
  })

  // ── Página actual ───────────────────────────────────────────────────
  const aqui = window.location.pathname.replace(/\/$/, '')
  nav.querySelectorAll<HTMLAnchorElement>('.nav__menu a').forEach((a) => {
    const destino = new URL(a.href, window.location.origin).pathname.replace(/\/$/, '')
    if (destino && destino === aqui) {
      a.setAttribute('aria-current', 'page')
      a.classList.add('is-current')
      a.closest('.nav__item')?.querySelector('.nav__trigger')?.classList.add('is-current')
    }
  })
}
