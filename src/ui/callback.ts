import { t } from '../i18n/i18n'
import { trackCallbackSubmit } from './leadEvents'

// Widget "¿Te llamamos?": el visitante deja nombre + teléfono y Sofía (IA)
// le marca al instante vía POST /api/callback. Se monta en dos lugares:
// panel del botón flotante (#callback-panel) y bloque de la sección CTA
// (#callback-inline). El servidor es la autoridad de validación y límites;
// aquí solo se hace una verificación ligera.

const PHONE_RE = /^[\d\s()+.-]{7,20}$/

// El markup usa data-i18n para que el toggle de idioma lo re-traduzca solo;
// los placeholders no los cubre applyTranslations, se pintan en refresh().
function formHTML(prefix: string): string {
  return `
    <p class="cb-form__title" data-i18n="callback.title"></p>
    <p class="cb-form__body" data-i18n="callback.body"></p>
    <form class="cb-form" novalidate>
      <input class="cb-form__input" name="nombre" type="text" autocomplete="name" maxlength="80" required id="${prefix}-nombre" />
      <input class="cb-form__input" name="telefono" type="tel" autocomplete="tel" maxlength="20" required id="${prefix}-telefono" />
      <input class="cb-form__hp" name="web" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <button class="btn btn--primary cb-form__submit" type="submit" data-i18n="callback.submit"></button>
      <p class="cb-form__consent" data-i18n="callback.consent"></p>
      <p class="cb-form__status" role="status" aria-live="polite"></p>
    </form>`
}

function mountForm(container: HTMLElement, source: string): () => void {
  container.innerHTML = formHTML(container.id || source)
  const form = container.querySelector<HTMLFormElement>('.cb-form')!
  const nombre = form.querySelector<HTMLInputElement>('input[name="nombre"]')!
  const telefono = form.querySelector<HTMLInputElement>('input[name="telefono"]')!
  const honeypot = form.querySelector<HTMLInputElement>('input[name="web"]')!
  const submit = form.querySelector<HTMLButtonElement>('.cb-form__submit')!
  const status = form.querySelector<HTMLParagraphElement>('.cb-form__status')!

  // Textos que applyTranslations no cubre (placeholders) + los data-i18n
  // recién inyectados (la pasada inicial corrió antes de este mount).
  const refresh = (): void => {
    container.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n!)
    })
    nombre.placeholder = t('callback.name')
    telefono.placeholder = t('callback.phone')
  }
  refresh()

  let enviado = false
  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (enviado) return
    status.className = 'cb-form__status'
    if (!nombre.value.trim() || !PHONE_RE.test(telefono.value.trim())) {
      status.textContent = t('callback.invalid')
      status.classList.add('cb-form__status--error')
      return
    }
    submit.disabled = true
    submit.textContent = t('callback.sending')
    try {
      const res = await fetch('/api/callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.value.trim(),
          telefono: telefono.value.trim(),
          idioma: document.documentElement.lang === 'en' ? 'en' : 'es',
          web: honeypot.value,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; repetido?: boolean }
      if (res.status === 429) {
        status.textContent = t('callback.limit')
        status.classList.add('cb-form__status--error')
      } else if (res.ok && body.repetido) {
        status.textContent = t('callback.repeat')
      } else if (res.ok && body.ok) {
        enviado = true
        form.classList.add('cb-form--done')
        status.textContent = t('callback.success')
        status.classList.add('cb-form__status--ok')
        trackCallbackSubmit(source)
      } else {
        status.textContent = t('callback.error')
        status.classList.add('cb-form__status--error')
      }
    } catch {
      status.textContent = t('callback.error')
      status.classList.add('cb-form__status--error')
    } finally {
      submit.disabled = enviado
      submit.textContent = t('callback.submit')
    }
  })

  return refresh
}

export function initCallback(): void {
  const refreshers: (() => void)[] = []

  const panel = document.getElementById('callback-panel')
  const toggle = document.getElementById('callback-toggle')
  if (panel && toggle) {
    refreshers.push(mountForm(panel, 'floating-callback'))
    toggle.addEventListener('click', () => {
      const abierto = !panel.hidden
      panel.hidden = abierto
      toggle.setAttribute('aria-expanded', String(!abierto))
      if (!abierto) panel.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus()
    })
    document.addEventListener('click', event => {
      if (panel.hidden) return
      const target = event.target as Element
      if (!panel.contains(target) && !toggle.contains(target)) {
        panel.hidden = true
        toggle.setAttribute('aria-expanded', 'false')
      }
    })
  }

  const inline = document.getElementById('callback-inline')
  if (inline) refreshers.push(mountForm(inline, 'cta-callback'))

  // El toggle de idioma cambia <html lang>; re-pintar placeholders y textos.
  if ('MutationObserver' in window) {
    new MutationObserver(() => refreshers.forEach(r => r())).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })
  }
}
