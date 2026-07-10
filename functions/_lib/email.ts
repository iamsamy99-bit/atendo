/// <reference types="@cloudflare/workers-types" />
// Envío de correos vía Resend + plantillas personalizadas por lead.

export interface Lead {
  id: number
  nombre: string
  email: string | null
  empresa: string | null
  telefono: string | null
  industria: string | null
  plan_interes: string | null
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

/** Envuelve el cuerpo (texto plano con saltos de línea) en un HTML sobrio de marca. */
export function renderHtml(cuerpo: string, lead: Lead): string {
  const parrafos = personalizar(cuerpo, lead)
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;line-height:1.6;color:#111827">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
      <div style="background:#0d1117;padding:20px 28px">
        <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.5px">atendo<span style="color:#60a5fa">.</span></span>
      </div>
      <div style="padding:28px">${parrafos}</div>
      <div style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.5">
        Atendo — agentes de voz y chat con IA · <a href="https://atendo.lat" style="color:#2563eb">atendo.lat</a><br>
        ¿No quieres recibir más correos? Responde con la palabra <b>BAJA</b>.
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
