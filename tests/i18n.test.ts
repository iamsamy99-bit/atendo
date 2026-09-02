import { describe, it, expect, vi, beforeEach } from 'vitest'
import es from '../src/i18n/es.json'
import en from '../src/i18n/en.json'
import { applyTranslations } from '../src/i18n/i18n'

describe('dictionaries', () => {
  it('have identical key sets', () => {
    const esKeys = Object.keys(es).sort()
    const enKeys = Object.keys(en).sort()
    expect(esKeys).toEqual(enKeys)
  })
})

describe('applyTranslations', () => {
  beforeEach(() => {
    document.body.innerHTML = `<h1 data-i18n="hero.subtitle"></h1>`
  })

  it('fills element text from the dictionary', () => {
    applyTranslations('es')
    expect(document.querySelector('h1')!.textContent).toBe(es['hero.subtitle'])
  })

  it('switches text when language changes', () => {
    applyTranslations('en')
    expect(document.querySelector('h1')!.textContent).toBe(en['hero.subtitle'])
  })

  it('warns and leaves the key when it is missing', () => {
    document.body.innerHTML = `<span data-i18n="nope.missing"></span>`
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    applyTranslations('es')
    expect(document.querySelector('span')!.textContent).toBe('nope.missing')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
