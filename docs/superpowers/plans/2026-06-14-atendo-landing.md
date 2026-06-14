# Atendo Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (ES/EN) static landing page for "Atendo" (AI voice agents + websites agency) whose single goal is to get visitors to book a demo via Calendly.

**Architecture:** Static site built with Vite + vanilla TypeScript. No UI framework. Translatable text (including prices) lives in `es.json`/`en.json` and is applied to elements marked with `data-i18n`. Switching language re-applies the dictionary, which automatically changes prices and currency. Booking is handled by an embedded Calendly widget with a fallback link.

**Tech Stack:** Vite, TypeScript, Vitest (+ jsdom) for logic tests, plain CSS with custom properties, Calendly inline embed.

---

## File Structure

```
package.json            (scripts, deps)
tsconfig.json           (TS config from Vite template)
vitest.config.ts        (test env = jsdom)
index.html              (semantic structure, all text uses data-i18n)
src/
  main.ts               (entry: init i18n + nav + calendly)
  i18n/
    i18n.ts             (load dict, applyTranslations, setLang, getInitialLang)
    es.json             (spanish dict incl. prices)
    en.json             (english dict incl. prices)
  ui/
    nav.ts              (language toggle wiring + mobile menu)
    calendly.ts         (inject Calendly embed + fallback on failure)
  styles/
    base.css            (variables, reset, typography)
    layout.css          (nav, hero, sections, footer layout)
    components.css       (buttons, cards, pricing, FAQ)
tests/
  i18n.test.ts          (key parity + applyTranslations behavior)
public/
  (logo / assets)
```

---

## Task 1: Scaffold Vite vanilla-TS project

**Files:**
- Create: `package.json`, `tsconfig.json`, `index.html`, `src/main.ts` (via scaffold, then trimmed)

- [ ] **Step 1: Scaffold with Vite**

Run in the project root (`/home/newpc/voice-agency-landing`):
```bash
npm create vite@latest . -- --template vanilla-ts
```
If it complains the directory is not empty, choose "Ignore files and continue".

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D vitest jsdom
```

- [ ] **Step 3: Trim the template**

Delete starter files we won't use:
```bash
rm -f src/counter.ts src/typescript.svg public/vite.svg src/style.css
```

- [ ] **Step 4: Replace `src/main.ts` with a minimal entry**

```ts
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

console.log('Atendo landing loaded')
```

- [ ] **Step 5: Add the test script to `package.json`**

In `package.json`, inside `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 7: Verify dev server boots**

Run: `npm run dev`
Expected: Vite prints a Local URL (e.g. http://localhost:5173) with no errors. Stop it with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite vanilla-ts project for Atendo landing"
```

---

## Task 2: i18n dictionaries (ES + EN, including prices)

**Files:**
- Create: `src/i18n/es.json`
- Create: `src/i18n/en.json`

These hold every translatable string. Prices are just strings — switching language swaps them, which is exactly the required behavior.

- [ ] **Step 1: Create `src/i18n/es.json`**

```json
{
  "nav.services": "Servicios",
  "nav.pricing": "Precios",
  "nav.faq": "Preguntas",
  "nav.cta": "Agendar demo",

  "hero.title": "Atendo: tu recepcionista con IA, siempre activa",
  "hero.subtitle": "Agentes telefónicos con inteligencia artificial que contestan, informan y agendan citas por ti — 24/7, sin perder una sola llamada.",
  "hero.cta": "Agenda una demo gratis",
  "hero.trust": "Para negocios en México y Estados Unidos",

  "problem.title": "Cada llamada perdida es dinero perdido",
  "problem.body": "Tus clientes llaman fuera de horario, mientras atiendes a otro, o cuando estás ocupado. Si no contestas, llaman a tu competencia. Un agente de voz con IA contesta siempre.",

  "services.title": "Lo que hacemos por ti",
  "services.voice.title": "Agentes de voz con IA",
  "services.voice.body": "Un asistente telefónico que habla natural, responde dudas, toma datos y agenda citas en tu calendario.",
  "services.web.title": "Sitios web",
  "services.web.body": "Páginas modernas y rápidas que convierten visitas en clientes, listas para conectarse con tu agente de voz.",

  "how.title": "Cómo funciona",
  "how.step1.title": "1. Agendas una demo",
  "how.step1.body": "Nos cuentas de tu negocio y qué necesitas que conteste el agente.",
  "how.step2.title": "2. Configuramos tu agente",
  "how.step2.body": "Lo entrenamos con tu información y lo conectamos a tu teléfono.",
  "how.step3.title": "3. Empieza a contestar",
  "how.step3.body": "Tu agente atiende llamadas y agenda citas desde el primer día.",

  "benefits.title": "Por qué un agente de voz con IA",
  "benefits.b1": "Disponible 24/7, todos los días del año",
  "benefits.b2": "Nunca pierde una llamada",
  "benefits.b3": "Agenda citas automáticamente",
  "benefits.b4": "Habla español e inglés",

  "pricing.title": "Planes",
  "pricing.note": "Sin contratos forzosos. Cancela cuando quieras.",
  "pricing.starter.name": "Esencial",
  "pricing.starter.price": "$4,900 MXN/mes",
  "pricing.starter.f1": "1 agente de voz",
  "pricing.starter.f2": "Hasta 300 minutos/mes",
  "pricing.starter.f3": "Agenda de citas",
  "pricing.pro.name": "Negocio",
  "pricing.pro.price": "$9,900 MXN/mes",
  "pricing.pro.f1": "1 agente de voz",
  "pricing.pro.f2": "Hasta 1,000 minutos/mes",
  "pricing.pro.f3": "Agenda + recordatorios",
  "pricing.pro.badge": "Más popular",
  "pricing.premium.name": "Empresa",
  "pricing.premium.price": "$14,900 MXN/mes",
  "pricing.premium.f1": "Varios agentes",
  "pricing.premium.f2": "Minutos a la medida",
  "pricing.premium.f3": "Sitio web incluido",
  "pricing.cta": "Agendar demo",

  "faq.title": "Preguntas frecuentes",
  "faq.q1": "¿Se nota que es una IA?",
  "faq.a1": "La voz suena natural. La mayoría de quienes llaman no notan la diferencia, y siempre pueden pedir hablar con una persona.",
  "faq.q2": "¿En cuánto tiempo queda listo?",
  "faq.a2": "Normalmente en pocos días después de la demo, según la complejidad de tu negocio.",
  "faq.q3": "¿En qué idiomas habla?",
  "faq.a3": "Español e inglés, ideal para clientes en México y Estados Unidos.",
  "faq.q4": "¿Necesito instalar algo?",
  "faq.a4": "No. Funciona con tu número telefónico actual o uno nuevo que te proveemos.",

  "cta.title": "¿Listo para no volver a perder una llamada?",
  "cta.body": "Agenda una demo gratis y escucha a tu agente en acción.",
  "cta.fallback": "¿No carga el calendario? Escríbenos por WhatsApp.",

  "footer.tagline": "Agentes de voz con IA y sitios web para tu negocio.",
  "footer.rights": "Todos los derechos reservados."
}
```

- [ ] **Step 2: Create `src/i18n/en.json` (same keys, English + USD prices)**

```json
{
  "nav.services": "Services",
  "nav.pricing": "Pricing",
  "nav.faq": "FAQ",
  "nav.cta": "Book a demo",

  "hero.title": "Atendo: your AI receptionist, always on",
  "hero.subtitle": "AI phone agents that answer, inform, and book appointments for you — 24/7, never missing a single call.",
  "hero.cta": "Book a free demo",
  "hero.trust": "For businesses in Mexico and the United States",

  "problem.title": "Every missed call is lost money",
  "problem.body": "Your customers call after hours, while you're with someone else, or when you're busy. If you don't answer, they call your competitor. An AI voice agent always answers.",

  "services.title": "What we do for you",
  "services.voice.title": "AI voice agents",
  "services.voice.body": "A phone assistant that speaks naturally, answers questions, captures details, and books appointments on your calendar.",
  "services.web.title": "Websites",
  "services.web.body": "Modern, fast pages that turn visitors into customers, ready to connect with your voice agent.",

  "how.title": "How it works",
  "how.step1.title": "1. Book a demo",
  "how.step1.body": "Tell us about your business and what you need the agent to answer.",
  "how.step2.title": "2. We set up your agent",
  "how.step2.body": "We train it on your info and connect it to your phone.",
  "how.step3.title": "3. It starts answering",
  "how.step3.body": "Your agent handles calls and books appointments from day one.",

  "benefits.title": "Why an AI voice agent",
  "benefits.b1": "Available 24/7, every day of the year",
  "benefits.b2": "Never misses a call",
  "benefits.b3": "Books appointments automatically",
  "benefits.b4": "Speaks Spanish and English",

  "pricing.title": "Plans",
  "pricing.note": "No forced contracts. Cancel anytime.",
  "pricing.starter.name": "Starter",
  "pricing.starter.price": "$497 USD/mo",
  "pricing.starter.f1": "1 voice agent",
  "pricing.starter.f2": "Up to 300 minutes/mo",
  "pricing.starter.f3": "Appointment booking",
  "pricing.pro.name": "Pro",
  "pricing.pro.price": "$997 USD/mo",
  "pricing.pro.f1": "1 voice agent",
  "pricing.pro.f2": "Up to 1,000 minutes/mo",
  "pricing.pro.f3": "Booking + reminders",
  "pricing.pro.badge": "Most popular",
  "pricing.premium.name": "Enterprise",
  "pricing.premium.price": "$1,497 USD/mo",
  "pricing.premium.f1": "Multiple agents",
  "pricing.premium.f2": "Custom minutes",
  "pricing.premium.f3": "Website included",
  "pricing.cta": "Book a demo",

  "faq.title": "Frequently asked questions",
  "faq.q1": "Can people tell it's an AI?",
  "faq.a1": "The voice sounds natural. Most callers don't notice, and they can always ask to speak with a person.",
  "faq.q2": "How long until it's ready?",
  "faq.a2": "Usually within a few days after the demo, depending on your business's complexity.",
  "faq.q3": "What languages does it speak?",
  "faq.a3": "Spanish and English, ideal for customers in Mexico and the United States.",
  "faq.q4": "Do I need to install anything?",
  "faq.a4": "No. It works with your current phone number or a new one we provide.",

  "cta.title": "Ready to never miss a call again?",
  "cta.body": "Book a free demo and hear your agent in action.",
  "cta.fallback": "Calendar not loading? Message us on WhatsApp.",

  "footer.tagline": "AI voice agents and websites for your business.",
  "footer.rights": "All rights reserved."
}
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/es.json src/i18n/en.json
git commit -m "feat: add ES/EN i18n dictionaries with prices"
```

---

## Task 3: i18n logic module (TDD)

**Files:**
- Create: `tests/i18n.test.ts`
- Create: `src/i18n/i18n.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/i18n.test.ts`:
```ts
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
    document.body.innerHTML = `<h1 data-i18n="hero.title"></h1>`
  })

  it('fills element text from the dictionary', () => {
    applyTranslations('es')
    expect(document.querySelector('h1')!.textContent).toBe(es['hero.title'])
  })

  it('switches text when language changes', () => {
    applyTranslations('en')
    expect(document.querySelector('h1')!.textContent).toBe(en['hero.title'])
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `applyTranslations` is not exported / module not found.

- [ ] **Step 3: Implement `src/i18n/i18n.ts`**

```ts
import es from './es.json'
import en from './en.json'

export type Lang = 'es' | 'en'

const dictionaries: Record<Lang, Record<string, string>> = { es, en }
const STORAGE_KEY = 'atendo.lang'

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
  document.documentElement.lang = lang
}

export function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang)
  applyTranslations(lang)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all four tests green.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/i18n.ts tests/i18n.test.ts
git commit -m "feat: add i18n apply/setLang logic with key-parity tests"
```

---

## Task 4: HTML structure

**Files:**
- Modify: `index.html` (replace body)

- [ ] **Step 1: Replace `index.html`**

Use this full file:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atendo — Agentes de voz con IA</title>
    <meta name="description" content="Agentes telefónicos con IA y sitios web para negocios en México y Estados Unidos." />
  </head>
  <body>
    <header class="nav">
      <a class="nav__logo" href="#top">Atendo</a>
      <nav class="nav__links">
        <a href="#services" data-i18n="nav.services"></a>
        <a href="#pricing" data-i18n="nav.pricing"></a>
        <a href="#faq" data-i18n="nav.faq"></a>
      </nav>
      <div class="nav__actions">
        <button id="lang-toggle" class="lang-toggle" type="button">EN</button>
        <a href="#book" class="btn btn--primary" data-i18n="nav.cta"></a>
      </div>
    </header>

    <main id="top">
      <section class="hero">
        <h1 data-i18n="hero.title"></h1>
        <p class="hero__subtitle" data-i18n="hero.subtitle"></p>
        <a href="#book" class="btn btn--primary btn--lg" data-i18n="hero.cta"></a>
        <p class="hero__trust" data-i18n="hero.trust"></p>
      </section>

      <section class="section problem">
        <h2 data-i18n="problem.title"></h2>
        <p data-i18n="problem.body"></p>
      </section>

      <section id="services" class="section">
        <h2 data-i18n="services.title"></h2>
        <div class="cards">
          <article class="card">
            <h3 data-i18n="services.voice.title"></h3>
            <p data-i18n="services.voice.body"></p>
          </article>
          <article class="card">
            <h3 data-i18n="services.web.title"></h3>
            <p data-i18n="services.web.body"></p>
          </article>
        </div>
      </section>

      <section class="section">
        <h2 data-i18n="how.title"></h2>
        <div class="steps">
          <div class="step"><h3 data-i18n="how.step1.title"></h3><p data-i18n="how.step1.body"></p></div>
          <div class="step"><h3 data-i18n="how.step2.title"></h3><p data-i18n="how.step2.body"></p></div>
          <div class="step"><h3 data-i18n="how.step3.title"></h3><p data-i18n="how.step3.body"></p></div>
        </div>
      </section>

      <section class="section benefits">
        <h2 data-i18n="benefits.title"></h2>
        <ul class="benefits__list">
          <li data-i18n="benefits.b1"></li>
          <li data-i18n="benefits.b2"></li>
          <li data-i18n="benefits.b3"></li>
          <li data-i18n="benefits.b4"></li>
        </ul>
      </section>

      <section id="pricing" class="section">
        <h2 data-i18n="pricing.title"></h2>
        <div class="pricing">
          <article class="plan">
            <h3 data-i18n="pricing.starter.name"></h3>
            <p class="plan__price" data-i18n="pricing.starter.price"></p>
            <ul>
              <li data-i18n="pricing.starter.f1"></li>
              <li data-i18n="pricing.starter.f2"></li>
              <li data-i18n="pricing.starter.f3"></li>
            </ul>
            <a href="#book" class="btn btn--outline" data-i18n="pricing.cta"></a>
          </article>
          <article class="plan plan--featured">
            <span class="plan__badge" data-i18n="pricing.pro.badge"></span>
            <h3 data-i18n="pricing.pro.name"></h3>
            <p class="plan__price" data-i18n="pricing.pro.price"></p>
            <ul>
              <li data-i18n="pricing.pro.f1"></li>
              <li data-i18n="pricing.pro.f2"></li>
              <li data-i18n="pricing.pro.f3"></li>
            </ul>
            <a href="#book" class="btn btn--primary" data-i18n="pricing.cta"></a>
          </article>
          <article class="plan">
            <h3 data-i18n="pricing.premium.name"></h3>
            <p class="plan__price" data-i18n="pricing.premium.price"></p>
            <ul>
              <li data-i18n="pricing.premium.f1"></li>
              <li data-i18n="pricing.premium.f2"></li>
              <li data-i18n="pricing.premium.f3"></li>
            </ul>
            <a href="#book" class="btn btn--outline" data-i18n="pricing.cta"></a>
          </article>
        </div>
        <p class="pricing__note" data-i18n="pricing.note"></p>
      </section>

      <section id="faq" class="section">
        <h2 data-i18n="faq.title"></h2>
        <div class="faq">
          <details><summary data-i18n="faq.q1"></summary><p data-i18n="faq.a1"></p></details>
          <details><summary data-i18n="faq.q2"></summary><p data-i18n="faq.a2"></p></details>
          <details><summary data-i18n="faq.q3"></summary><p data-i18n="faq.a3"></p></details>
          <details><summary data-i18n="faq.q4"></summary><p data-i18n="faq.a4"></p></details>
        </div>
      </section>

      <section id="book" class="section cta">
        <h2 data-i18n="cta.title"></h2>
        <p data-i18n="cta.body"></p>
        <div id="calendly" class="calendly"></div>
        <p class="cta__fallback" data-i18n="cta.fallback"></p>
      </section>
    </main>

    <footer class="footer">
      <p class="footer__brand">Atendo</p>
      <p data-i18n="footer.tagline"></p>
      <p class="footer__rights">© 2026 Atendo. <span data-i18n="footer.rights"></span></p>
    </footer>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add landing HTML structure with data-i18n hooks"
```

---

## Task 5: Styles (base, layout, components)

**Files:**
- Create: `src/styles/base.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/components.css`

- [ ] **Step 1: Create `src/styles/base.css`**

```css
:root {
  --blue: #1d4ed8;
  --blue-dark: #1e40af;
  --ink: #0f172a;
  --muted: #475569;
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --border: #e2e8f0;
  --radius: 12px;
  --maxw: 1080px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: var(--font); color: var(--ink); background: var(--bg); line-height: 1.6; }
h1, h2, h3 { line-height: 1.2; }
h1 { font-size: clamp(2rem, 5vw, 3.25rem); }
h2 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); }
p { color: var(--muted); }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
```

- [ ] **Step 2: Create `src/styles/layout.css`**

```css
.nav {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: 1rem clamp(1rem, 4vw, 2rem);
  background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.nav__logo { font-weight: 800; font-size: 1.25rem; color: var(--blue); }
.nav__links { display: flex; gap: 1.5rem; }
.nav__links a { color: var(--muted); font-weight: 500; }
.nav__links a:hover { color: var(--ink); }
.nav__actions { display: flex; align-items: center; gap: 0.75rem; }

.hero {
  text-align: center; padding: clamp(3rem, 8vw, 6rem) 1.5rem;
  max-width: 820px; margin: 0 auto;
}
.hero__subtitle { font-size: 1.15rem; margin: 1.25rem auto 2rem; max-width: 640px; }
.hero__trust { margin-top: 1.5rem; font-size: 0.9rem; color: var(--muted); }

.section { max-width: var(--maxw); margin: 0 auto; padding: clamp(2.5rem, 6vw, 4.5rem) 1.5rem; }
.section h2 { text-align: center; margin-bottom: 2rem; }
.problem { text-align: center; max-width: 760px; }
.benefits__list { list-style: none; display: grid; gap: 0.75rem; max-width: 520px; margin: 0 auto; }
.benefits__list li { background: var(--bg-alt); padding: 0.85rem 1rem; border-radius: var(--radius); }

.cards, .steps { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.pricing { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); align-items: start; }

.cta { text-align: center; background: var(--bg-alt); border-radius: var(--radius); }
.calendly { min-height: 320px; margin: 2rem 0 1rem; }

.footer { text-align: center; padding: 2.5rem 1.5rem; border-top: 1px solid var(--border); }
.footer__brand { font-weight: 800; color: var(--blue); font-size: 1.15rem; }
.footer__rights { font-size: 0.85rem; margin-top: 0.5rem; }

@media (max-width: 640px) {
  .nav__links { display: none; }
}
```

- [ ] **Step 3: Create `src/styles/components.css`**

```css
.btn {
  display: inline-block; font-weight: 600; cursor: pointer;
  padding: 0.7rem 1.3rem; border-radius: 999px; border: 1px solid transparent;
  transition: transform .05s ease, background .15s ease;
}
.btn:active { transform: translateY(1px); }
.btn--primary { background: var(--blue); color: #fff; }
.btn--primary:hover { background: var(--blue-dark); }
.btn--outline { background: #fff; color: var(--blue); border-color: var(--blue); }
.btn--lg { padding: 0.9rem 1.8rem; font-size: 1.05rem; }

.lang-toggle {
  background: #fff; border: 1px solid var(--border); color: var(--muted);
  border-radius: 999px; padding: 0.45rem 0.8rem; font-weight: 600; cursor: pointer;
}
.lang-toggle:hover { color: var(--ink); border-color: var(--muted); }

.card, .step, .plan {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 1.5rem;
}
.card h3, .step h3, .plan h3 { margin-bottom: 0.5rem; }

.plan { position: relative; text-align: center; display: flex; flex-direction: column; gap: 1rem; }
.plan ul { list-style: none; display: grid; gap: 0.5rem; color: var(--muted); }
.plan__price { font-size: 1.6rem; font-weight: 800; color: var(--ink); }
.plan .btn { margin-top: auto; }
.plan--featured { border-color: var(--blue); box-shadow: 0 8px 30px rgba(29,78,216,0.12); }
.plan__badge {
  position: absolute; top: -0.75rem; left: 50%; transform: translateX(-50%);
  background: var(--blue); color: #fff; font-size: 0.75rem; font-weight: 700;
  padding: 0.25rem 0.75rem; border-radius: 999px;
}
.pricing__note { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; }

.faq { max-width: 720px; margin: 0 auto; display: grid; gap: 0.75rem; }
.faq details { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; }
.faq summary { font-weight: 600; cursor: pointer; }
.faq details p { margin-top: 0.5rem; }

.cta__fallback { font-size: 0.9rem; }
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`, open the URL. Expected: page renders styled (blue/white), though text is empty until i18n runs in Task 6. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/styles
git commit -m "feat: add base, layout, and component styles"
```

---

## Task 6: Nav wiring + Calendly + app entry

**Files:**
- Create: `src/ui/nav.ts`
- Create: `src/ui/calendly.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create `src/ui/nav.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/ui/calendly.ts`**

```ts
// Loads the Calendly inline widget. If it fails to load (offline, blocked),
// the fallback paragraph already in the DOM stays visible.
const CALENDLY_URL = 'https://calendly.com/atendo/demo' // TODO: replace with real Calendly link

export function initCalendly(): void {
  const container = document.getElementById('calendly')
  if (!container) return

  const script = document.createElement('script')
  script.src = 'https://assets.calendly.com/assets/external/widget.js'
  script.async = true
  script.onload = () => {
    // @ts-expect-error Calendly is injected globally by the widget script
    if (window.Calendly) {
      // @ts-expect-error global
      window.Calendly.initInlineWidget({ url: CALENDLY_URL, parentElement: container })
    }
  }
  script.onerror = () => {
    console.warn('[calendly] widget failed to load; fallback link shown')
  }
  document.head.appendChild(script)
}
```

- [ ] **Step 3: Replace `src/main.ts`**

```ts
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import { getInitialLang, applyTranslations } from './i18n/i18n'
import { initNav } from './ui/nav'
import { initCalendly } from './ui/calendly'

const lang = getInitialLang()
applyTranslations(lang)
initNav(lang)
initCalendly()
```

- [ ] **Step 4: Verify the whole page works**

Run: `npm run dev`, open the URL. Expected:
- All text appears in Spanish.
- Clicking the `EN` button switches every text to English AND prices change to USD; clicking again returns to Spanish/MXN.
- Reloading keeps the last chosen language (localStorage).
- The Calendly area shows the widget or the fallback text.
Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/ui/nav.ts src/ui/calendly.ts src/main.ts
git commit -m "feat: wire language toggle and Calendly embed"
```

---

## Task 7: Build verification + deploy notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: PASS (i18n tests green).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: completes with no TypeScript errors; creates `dist/`.

- [ ] **Step 3: Preview the build**

Run: `npm run preview`, open the URL, confirm the page works as in Task 6. Stop with Ctrl+C.

- [ ] **Step 4: Create `README.md`**

```markdown
# Atendo — Landing Page

Bilingual (ES/EN) static landing for Atendo: AI voice agents + websites.

## Develop
- `npm install`
- `npm run dev` — local dev server
- `npm test` — run i18n tests
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the build

## Editing content
All text and prices live in `src/i18n/es.json` and `src/i18n/en.json`.
Both files must have the exact same set of keys (a test enforces this).

## Before going live
- Replace the Calendly URL in `src/ui/calendly.ts` (`CALENDLY_URL`).
- Replace the WhatsApp/fallback wording in the i18n files if needed.

## Deploy
Connect the repo to Netlify or Vercel. Build command: `npm run build`. Publish dir: `dist`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add README with dev and deploy instructions"
```

---

## Self-Review notes

- **Spec coverage:** stack (T1), i18n + prices-by-language (T2/T3/T6), all 10 sections (T4), visual style (T5), Calendly + fallback (T6), missing-key handling (T3), i18n parity test + build green (T3/T7), deploy (T7). All covered.
- **Simplification vs spec §7:** prices are i18n keys instead of a separate `pricing.ts` module (DRY; language switch already changes prices). No `ui/pricing.ts` is needed.
- **Type consistency:** `Lang`, `applyTranslations`, `setLang`, `getInitialLang` defined in T3 and used consistently in T6.
- **Open placeholder (intentional):** real Calendly URL and WhatsApp number are TODO content the owner must supply before launch (noted in README + code comment), not plan gaps.
