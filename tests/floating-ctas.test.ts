import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initFloatingCtas } from '../src/ui/floatingCtas'

/** jsdom no trae IntersectionObserver; se simula para controlar el hero. */
let triggerHero: (visible: boolean) => void

function setupDom() {
  document.body.innerHTML = `
    <section class="hero-dark"></section>
    <div class="cb-float"><button id="callback-toggle"></button><div id="callback-panel" hidden></div></div>
    <a class="call-float"></a>
  `
  const cbs: Array<(e: Array<{ isIntersecting: boolean }>) => void> = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: (e: Array<{ isIntersecting: boolean }>) => void) { cbs.push(cb) }
    observe() {}
    disconnect() {}
  })
  triggerHero = (visible) => cbs.forEach(cb => cb([{ isIntersecting: visible }]))
}

const floats = () => Array.from(document.querySelectorAll('.cb-float, .call-float'))
const hidden = () => floats().every(el => el.classList.contains('floats-hidden'))
const visible = () => floats().every(el => !el.classList.contains('floats-hidden'))

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('initFloatingCtas', () => {
  beforeEach(() => {
    setupDom()
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  })

  it('los oculta mientras el hero está a la vista (ahí son redundantes)', () => {
    initFloatingCtas()
    triggerHero(true)
    expect(hidden()).toBe(true)
  })

  it('los muestra al pasar el hero', () => {
    initFloatingCtas()
    triggerHero(false)
    expect(visible()).toBe(true)
  })

  it('los oculta al hacer scroll hacia abajo, para no tapar el contenido', () => {
    initFloatingCtas()
    triggerHero(false)
    scrollTo(600)
    expect(hidden()).toBe(true)
  })

  it('los devuelve al hacer scroll hacia arriba', () => {
    initFloatingCtas()
    triggerHero(false)
    scrollTo(600)
    scrollTo(400)
    expect(visible()).toBe(true)
  })

  it('ignora micro-scrolls para no parpadear con la inercia', () => {
    initFloatingCtas()
    triggerHero(false)
    scrollTo(600)
    expect(hidden()).toBe(true)
    scrollTo(597) // menor al umbral: no debe revelarlos
    expect(hidden()).toBe(true)
  })

  it('NO los oculta si el panel de callback está abierto', () => {
    initFloatingCtas()
    triggerHero(false)
    const panel = document.getElementById('callback-panel')!
    panel.removeAttribute('hidden')
    scrollTo(600)
    expect(visible()).toBe(true)
  })

  it('no falla en páginas sin botones flotantes', () => {
    document.body.innerHTML = '<section class="hero-dark"></section>'
    expect(() => initFloatingCtas()).not.toThrow()
  })
})
