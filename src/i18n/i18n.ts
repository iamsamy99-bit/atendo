import es from './es.json'
import en from './en.json'

export type Lang = 'es' | 'en'

const dictionaries: Record<Lang, Record<string, string>> = { es, en }
const STORAGE_KEY = 'atendo.lang'

/** Lookup directo para módulos que pintan texto por JS (p.ej. el chat simulado). */
export function t(key: string, lang?: Lang): string {
  const l: Lang = lang ?? (document.documentElement.lang === 'en' ? 'en' : 'es')
  return dictionaries[l][key] ?? key
}

export function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'es'
}

export function applyTranslations(lang: Lang): void {
  const dict = dictionaries[lang]
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n!
    const value = dict[key]
    if (value === undefined) {
      console.warn(`[i18n] missing key "${key}" for lang "${lang}"`)
      el.textContent = key
      return
    }
    el.textContent = value
  })
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder!
    const value = dict[key]
    el.placeholder = value ?? key
  })
  document.documentElement.lang = lang
}

export function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang)
  applyTranslations(lang)
}
