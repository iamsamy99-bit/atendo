# Atendo — Landing Page · Documento de Diseño

**Fecha:** 2026-06-14
**Estado:** Aprobado por el cliente (Samuel)

## 1. Resumen

Landing page para **Atendo**, una agencia que vende **agentes telefónicos de voz con IA** y
**sitios web** a negocios en México y Estados Unidos. El objetivo de la página es uno solo:
**que el visitante agende una llamada (demo) por Calendly.**

## 2. Objetivos y criterios de éxito

- **Objetivo principal:** convertir visitas en llamadas agendadas (Calendly).
- **Éxito:** página clara, profesional (estilo "confianza"), bilingüe ES/EN, que carga rápido
  y se puede publicar gratis (estática).
- **No-objetivos (YAGNI):** sin login, sin dashboard de cliente, sin backend propio, sin CMS,
  sin pasarela de pagos en esta etapa.

## 3. Dirección visual

- **Estilo:** Corporativo / Confianza — fondo blanco, acento azul, tipografía limpia (sans-serif),
  mucho aire, bordes suaves. Transmite seriedad y profesionalismo.
- **Paleta base:** azul primario (#1d4ed8) sobre blanco/gris claro (#f8fafc), texto en gris oscuro (#0f172a).

## 4. Stack técnico

- **Vite + TypeScript "vanilla"** (HTML + CSS + TS, sin framework de UI).
  - Razón: cercano a programar a mano (HTML/CSS explícitos), TS solo para la lógica.
- **CSS:** hojas de estilo propias con variables CSS (custom properties) para colores/espaciado.
  Sin librería de componentes.
- **Sin backend:** todo estático. Despliegue en Netlify o Vercel (gratis).
- **Agendado:** Calendly (embed inline + link de respaldo).

## 5. Internacionalización (bilingüe ES/EN)

- Diccionarios `src/i18n/es.json` y `src/i18n/en.json` con las mismas claves.
- El HTML marca textos traducibles con `data-i18n="clave"`.
- Un módulo TS (`src/i18n/i18n.ts`) carga el diccionario, reemplaza textos y maneja el toggle.
- Preferencia de idioma guardada en `localStorage`; idioma por defecto = español.
- **Moneda atada al idioma:** ES → precios en MXN; EN → precios en USD.

## 6. Estructura de la página (secciones)

1. **Nav** — logo "Atendo", links de ancla, switch ES/EN, botón CTA "Agendar demo".
2. **Hero** — titular, subtítulo, CTA a Calendly, franja de confianza (ej. "Para negocios en MX y US").
3. **El problema** — cada llamada perdida = dinero perdido / clientes que se van.
4. **Servicios** — 2 tarjetas: (a) Agentes de voz IA, (b) Sitios web.
5. **Cómo funciona** — 3 pasos (1. Agendas demo · 2. Configuramos tu agente · 3. Empieza a contestar).
6. **Beneficios** — 24/7, nunca pierde una llamada, agenda citas, multilingüe, etc.
7. **Precios** — 3 planes con moneda según idioma:
   - Esencial / Starter
   - Negocio / Pro (destacado)
   - Empresa / Premium
   - Nota: precios son configurables; ver tabla de referencia en sección 9.
8. **FAQ** — 4–6 preguntas comunes (¿se nota que es IA?, ¿en cuánto se instala?, ¿idiomas?, etc.).
9. **CTA final** — Calendly embebido + texto de cierre.
10. **Footer** — contacto, redes, aviso legal mínimo.

## 7. Arquitectura de archivos (propuesta)

Cada sección es un módulo enfocado para mantenerlo legible:

```
index.html              (estructura semántica con data-i18n)
src/
  main.ts               (punto de entrada: inicializa i18n, Calendly, interacciones)
  i18n/
    i18n.ts             (lógica de traducción + toggle + moneda)
    es.json
    en.json
  ui/
    nav.ts              (toggle idioma, menú móvil)
    pricing.ts          (render de precios según moneda)
    calendly.ts         (carga embed + fallback)
  styles/
    base.css            (variables, reset, tipografía)
    layout.css          (nav, hero, secciones, footer)
    components.css       (botones, tarjetas, precios, FAQ)
public/
  (assets: logo, imágenes)
```

## 8. Manejo de errores y casos borde

- **Calendly no carga:** mostrar mensaje + link de respaldo (ej. "Escríbeme por WhatsApp" o mailto).
- **Clave i18n faltante:** mostrar la clave en bruto y registrar advertencia en consola (para detectarlo en desarrollo).
- **JS deshabilitado:** el contenido principal (textos en español por defecto) debe seguir siendo legible;
  el CTA del nav es un enlace normal a la sección de Calendly.

## 9. Precios de referencia (editables en los diccionarios)

| Plan | EE.UU. (USD/mes) | México (MXN/mes) |
|---|---|---|
| Esencial / Starter | $497 | $4,900 |
| Negocio / Pro | $997 | $9,900 |
| Empresa / Premium | $1,497 | $14,900 |

(Setup y uso por minuto se mencionan como "desde", configurables más adelante.)

## 10. Testing

- **Verificación de i18n:** prueba que toda clave usada en `data-i18n` exista en `es.json` y `en.json`
  (y que ambos diccionarios tengan el mismo conjunto de claves).
- **Build verde:** `npm run build` compila sin errores de TypeScript.
- **Revisión manual:** abrir en navegador, alternar ES/EN, verificar que precios cambian de moneda
  y que el CTA de Calendly abre el agendado.

## 11. Despliegue

- Repo en git; publicar en Netlify o Vercel conectando el repo.
- `npm run build` genera `dist/` estático.
