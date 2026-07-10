/// <reference types="@cloudflare/workers-types" />
// Cron de recordatorios automáticos de Atendo.
//
// Regla (definida con Samuel, 2026-07-09):
//   - Leads en estado contactado / propuesta_enviada / calificado
//   - que llevan >= 5 días sin actualizarse (sin avanzar)
//   - y a los que NUNCA se les ha mandado un recordatorio automático (máx 1)
//   - con email válido
// Envía un correo personalizado vía Resend, lo registra en `seguimientos`
// (origen='automatico') y marca leads.ultimo_seguimiento_at.
//
// Se ejecuta solo por el cron diario. Para probar/forzar a mano:
//   GET /run?key=<CRON_RUN_KEY>   (devuelve cuántos envió, no manda de más por el guard de máx 1)

interface Env {
  DB: D1Database
  RESEND_API_KEY: string
  CRON_RUN_KEY?: string
}

const DIAS_SIN_AVANCE = 5
const ESTADOS = ['contactado', 'propuesta_enviada', 'calificado']

interface Lead {
  id: number
  nombre: string
  email: string
  empresa: string | null
  plan_interes: string | null
  industria: string | null
}

const ASUNTO = '{primer_nombre}, ¿te late que te muestre Atendo?'
const CUERPO = `Hola {primer_nombre},

Hace unos días platicamos sobre cómo Atendo podría ayudar a {empresa} con {plan}. No quiero que se te pase.

¿Te late una llamada corta esta semana? En 15 minutos te muestro cómo quedaría en tu caso y resuelvo cualquier duda.

Si prefieres, respóndeme por aquí y coordinamos.

Saludos,
Samuel — Atendo`

function personalizar(texto: string, l: Lead): string {
  const primer = (l.nombre || '').trim().split(/\s+/)[0] || 'hola'
  const map: Record<string, string> = {
    nombre: l.nombre?.trim() || 'hola',
    primer_nombre: primer,
    empresa: l.empresa?.trim() || 'tu negocio',
    plan: l.plan_interes?.trim() || 'el servicio que consultaste',
    industria: l.industria?.trim() || 'tu sector',
  }
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m))
}

function html(l: Lead): string {
  const parrafos = personalizar(CUERPO, l).split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;line-height:1.6;color:#111827">${p.replace(/\n/g, '<br>')}</p>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif">
      <div style="background:#0d1117;padding:20px 28px"><span style="font-size:20px;font-weight:700;color:#fff">atendo<span style="color:#60a5fa">.</span></span></div>
      <div style="padding:28px">${parrafos}</div>
      <div style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.5">
        Atendo · <a href="https://atendo.lat" style="color:#2563eb">atendo.lat</a><br>
        ¿No quieres recibir más correos? Responde con la palabra <b>BAJA</b>.
      </div>
    </div></body></html>`
}

async function ejecutar(env: Env): Promise<{ enviados: number; fallidos: number }> {
  const { results } = await env.DB.prepare(`
    SELECT l.id, l.nombre, l.email, l.empresa, l.plan_interes, l.industria
    FROM leads l
    WHERE l.estado IN ('contactado','propuesta_enviada','calificado')
      AND l.email LIKE '%@%'
      AND julianday('now') - julianday(l.updated_at) >= ?
      AND NOT EXISTS (SELECT 1 FROM seguimientos s WHERE s.lead_id = l.id AND s.origen = 'automatico')
  `).bind(DIAS_SIN_AVANCE).all<Lead>()

  let enviados = 0, fallidos = 0
  for (const lead of results) {
    let ok = false, errMsg: string | null = null, resendId: string | null = null
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'Atendo <hola@atendo.lat>', to: [lead.email],
          subject: personalizar(ASUNTO, lead), html: html(lead),
          reply_to: 'hola@atendo.lat',
          headers: { 'List-Unsubscribe': '<mailto:hola@atendo.lat?subject=baja>' },
        }),
      })
      const body = await res.json().catch(() => ({})) as { id?: string; message?: string }
      ok = res.ok
      resendId = body.id ?? null
      if (!ok) errMsg = body.message ?? `HTTP ${res.status}`
    } catch (e) {
      errMsg = e instanceof Error ? e.message : 'error de red'
    }
    await env.DB.prepare(
      'INSERT INTO seguimientos (lead_id, email, asunto, estado, origen, error, resend_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(lead.id, lead.email, personalizar(ASUNTO, lead), ok ? 'enviado' : 'fallido', 'automatico', errMsg, resendId).run()
    if (ok) {
      enviados++
      await env.DB.prepare("UPDATE leads SET ultimo_seguimiento_at = datetime('now') WHERE id = ?").bind(lead.id).run()
    } else {
      fallidos++
    }
    await new Promise(r => setTimeout(r, 120))
  }
  return { enviados, fallidos }
}

export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const r = await ejecutar(env)
    console.log(`[recordatorios] enviados=${r.enviados} fallidos=${r.fallidos}`)
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/run') {
      if (!env.CRON_RUN_KEY || url.searchParams.get('key') !== env.CRON_RUN_KEY) {
        return new Response('no autorizado', { status: 401 })
      }
      const r = await ejecutar(env)
      return Response.json(r)
    }
    return new Response('atendo-recordatorios activo', { status: 200 })
  },
}
