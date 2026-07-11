// Spotlight border para el bento grid: un gradiente radial sigue al cursor
// sobre cada tarjeta (variables CSS --mx/--my), throttled con rAF.
// Solo se activa con puntero fino (en táctil no hay hover que seguir).
export function initSpotlight(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const grid = document.getElementById('bento')
  if (!grid) return
  const cells = Array.from(grid.querySelectorAll<HTMLElement>('.bento__cell'))
  if (cells.length === 0) return

  let raf = 0
  let lastEvent: PointerEvent | null = null

  const apply = () => {
    raf = 0
    const e = lastEvent
    if (!e) return
    for (const cell of cells) {
      const r = cell.getBoundingClientRect()
      cell.style.setProperty('--mx', `${e.clientX - r.left}px`)
      cell.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
  }

  grid.addEventListener('pointermove', (e) => {
    lastEvent = e
    if (!raf) raf = requestAnimationFrame(apply)
  }, { passive: true })

  grid.addEventListener('pointerleave', () => {
    for (const cell of cells) {
      cell.style.setProperty('--mx', '-999px')
      cell.style.setProperty('--my', '-999px')
    }
  })
}
