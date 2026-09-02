/**
 * Los dos botones flotantes (callback + llamar a Sofía) viven fijos abajo a la
 * izquierda y ocupan un bloque de ~171x111 px. Medido sobre la pagina real,
 * eso tapaba entre 19 y 25 elementos por ancho de pantalla, varios de ellos
 * cliqueables ("Saber mas", "Cotizar mi caso", "Hablar con Sofia"), porque el
 * FAB intercepta el clic. Mover los botones a la derecha no es opcion: ahi
 * vive el launcher de Crisp.
 *
 * Solucion sin sacrificar el texto de los botones (que aporta conversion):
 *  - Ocultos mientras el hero esta a la vista: ahi son redundantes, el hero ya
 *    tiene sus propios CTA de demo y llamada.
 *  - Ocultos mientras se hace scroll hacia abajo (el usuario esta leyendo) y
 *    visibles al hacer scroll hacia arriba, que es cuando aparece intencion de
 *    accion. Asi el contenido queda siempre alcanzable.
 *  - Nunca se ocultan con el panel de callback abierto: seria cortarle el
 *    formulario al usuario a media captura.
 */

const HIDDEN_CLASS = 'floats-hidden'
/** Margen para no parpadear con el scroll por inercia o rebote del navegador. */
const SCROLL_DELTA = 6

export function initFloatingCtas(): void {
  const wrappers = [
    document.querySelector<HTMLElement>('.cb-float'),
    document.querySelector<HTMLElement>('.call-float'),
  ].filter((el): el is HTMLElement => el !== null)

  if (wrappers.length === 0) return

  const panel = document.getElementById('callback-panel')
  const hero = document.querySelector<HTMLElement>('.hero-dark')

  let heroVisible = !!hero
  let scrollingDown = false
  let lastY = window.scrollY

  const panelOpen = () => !!panel && !panel.hidden

  const apply = () => {
    const hide = !panelOpen() && (heroVisible || scrollingDown)
    wrappers.forEach((el) => el.classList.toggle(HIDDEN_CLASS, hide))
  }

  if (hero && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { heroVisible = e.isIntersecting })
        apply()
      },
      // Basta con que asome una franja del hero para considerarlo visible.
      { threshold: 0, rootMargin: '-64px 0px -35% 0px' }
    )
    observer.observe(hero)
  } else {
    heroVisible = false
  }

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY
      const diff = y - lastY
      if (Math.abs(diff) > SCROLL_DELTA) {
        scrollingDown = diff > 0
        lastY = y
        apply()
      }
    },
    { passive: true }
  )

  // Al abrir o cerrar el panel de callback hay que reevaluar de inmediato.
  if (panel && 'MutationObserver' in window) {
    new MutationObserver(apply).observe(panel, { attributes: true, attributeFilter: ['hidden'] })
  }

  apply()
}
