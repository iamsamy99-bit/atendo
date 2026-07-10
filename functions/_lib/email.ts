/// <reference types="@cloudflare/workers-types" />
// Envío de correos vía Resend + plantillas personalizadas por lead.
import { beneficiosPara } from './templates'

export interface Lead {
  id: number
  nombre: string
  email: string | null
  empresa: string | null
  telefono: string | null
  industria: string | null
  plan_interes: string | null
  necesidad: string | null
  siguiente_accion: string | null
  canal: string
}

const CANAL_LABEL: Record<string, string> = {
  calendly: 'Calendly', telefono: 'teléfono', whatsapp: 'WhatsApp',
  crisp: 'chat', pricing: 'la página de planes', referido: 'un referido', otro: 'otro medio',
}

/** Sustituye los marcadores {nombre}, {empresa}, etc. con los datos del lead.
 *  Un marcador sin dato se reemplaza por un texto neutral, nunca por "null". */
export function personalizar(texto: string, lead: Lead): string {
  const primerNombre = (lead.nombre || '').trim().split(/\s+/)[0] || 'hola'
  const map: Record<string, string> = {
    nombre: lead.nombre?.trim() || 'hola',
    primer_nombre: primerNombre,
    empresa: lead.empresa?.trim() || 'tu negocio',
    plan: lead.plan_interes?.trim() || 'el servicio que consultaste',
    industria: lead.industria?.trim() || 'tu sector',
    canal: CANAL_LABEL[lead.canal] || 'nuestro sitio',
    siguiente_accion: lead.siguiente_accion?.trim() || '',
  }
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m))
}

export interface RenderOpts {
  ctaLabel?: string
  ctaUrl?: string
}

/** Lista de beneficios como HTML con palomita, adaptada al interés del lead. */
function beneficiosHtml(lead: Lead): string {
  const items = beneficiosPara({ plan_interes: lead.plan_interes, necesidad: lead.necesidad, canal: lead.canal })
  const filas = items.map(b => `
    <tr><td style="vertical-align:top;padding:0 8px 10px 0;color:#2563eb;font-weight:700">✓</td>
        <td style="padding:0 0 10px;color:#374151;line-height:1.5">${b}</td></tr>`).join('')
  return `<table style="width:100%;border-collapse:collapse;margin:4px 0 20px">${filas}</table>`
}

function parrafos(texto: string): string {
  return texto.split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;line-height:1.6;color:#111827">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Convierte el cuerpo (texto con {beneficios} y saltos de línea) en HTML de marca,
 *  con bloque de beneficios adaptativo y botón de acción (CTA). El marcador
 *  {beneficios} se expande esté en su propio párrafo o al final de una línea. */
export function renderHtml(cuerpo: string, lead: Lead, opts: RenderOpts = {}): string {
  // Separa el marcador {beneficios} (en su propia línea) y expande cada segmento.
  const bloques = personalizar(cuerpo, lead)
    .split(/^[ \t]*\{beneficios\}[ \t]*$/m)
    .map(parrafos)
    .join(beneficiosHtml(lead))

  const cta = opts.ctaLabel && opts.ctaUrl ? `
    <div style="text-align:center;margin:26px 0 6px">
      <a href="${opts.ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 30px;border-radius:10px">${opts.ctaLabel}</a>
    </div>` : ''

  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:24px">
    <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;box-shadow:0 8px 30px rgba(17,24,39,0.08)">
      <div style="background:#0d1117;padding:22px 30px">
        <span style="font-size:21px;font-weight:700;color:#fff;letter-spacing:-.5px">atendo<span style="color:#60a5fa">.</span></span>
        <span style="float:right;color:#9ca3af;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding-top:6px;display:inline-block">Agentes con IA</span>
      </div>
      <div style="padding:30px">${bloques}${cta}</div>
      <div style="padding:18px 30px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.6">
        <b style="color:#6b7280">Atendo</b> — agentes de voz y chat con IA para tu negocio<br>
        <a href="https://atendo.lat" style="color:#2563eb">atendo.lat</a> · ¿No quieres recibir más correos? Responde con la palabra <b>BAJA</b>.
      </div>
    </div></body></html>`
}

export interface SendResult { ok: boolean; id?: string; error?: string }

export async function enviarCorreo(
  apiKey: string,
  opts: { to: string; subject: string; html: string; replyTo?: string }
): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'Atendo <hola@atendo.lat>',
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo ?? 'hola@atendo.lat',
        headers: { 'List-Unsubscribe': '<mailto:hola@atendo.lat?subject=baja>' },
      }),
    })
    const body = await res.json().catch(() => ({})) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: body.message ?? `HTTP ${res.status}` }
    return { ok: true, id: body.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red' }
  }
}
