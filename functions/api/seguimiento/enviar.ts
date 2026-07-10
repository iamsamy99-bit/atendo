import { json, type Env } from '../../_lib/auth'
import { personalizar, renderHtml, enviarCorreo, type Lead } from '../../_lib/email'

// POST /api/seguimiento/enviar
// Body: { estado, asunto, cuerpo }  (asunto y cuerpo admiten {nombre}, {empresa}, {plan}, etc.)
// Envía un correo personalizado a cada lead del estado que tenga email, con un
// pequeño retraso entre envíos, y registra cada uno en la tabla seguimientos.
export const onRequestPost: PagesFunction<Env> = async ctx => {
  const apiKey = ctx.env.RESEND_API_KEY
  if (!apiKey) return json({ error: 'Falta configurar RESEND_API_KEY' }, 500)

  let body: { estado?: string; asunto?: string; cuerpo?: string }
  try { body = await ctx.request.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const estado = String(body.estado ?? '').trim()
  const asunto = String(body.asunto ?? '').trim()
  const cuerpo = String(body.cuerpo ?? '').trim()
  if (!estado || !asunto || !cuerpo) return json({ error: 'Faltan estado, asunto o cuerpo' }, 400)

  const { results } = await ctx.env.DB
    .prepare('SELECT id, nombre, email, empresa, telefono, industria, plan_interes, siguiente_accion, canal FROM leads WHERE estado = ?')
    .bind(estado)
    .all<Lead>()
  const destinatarios = results.filter(l => l.email && l.email.includes('@'))
  if (destinatarios.length === 0) return json({ error: 'No hay leads con email en ese estado' }, 400)

  let enviados = 0, fallidos = 0
  const errores: string[] = []
  for (const lead of destinatarios) {
    const r = await enviarCorreo(apiKey, {
      to: lead.email!,
      subject: personalizar(asunto, lead),
      html: renderHtml(cuerpo, lead),
    })
    await ctx.env.DB.prepare(
      'INSERT INTO seguimientos (lead_id, email, asunto, estado, origen, error, resend_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(lead.id, lead.email, personalizar(asunto, lead), r.ok ? 'enviado' : 'fallido', 'manual', r.error ?? null, r.id ?? null).run()
    if (r.ok) {
      enviados++
      await ctx.env.DB.prepare("UPDATE leads SET ultimo_seguimiento_at = datetime('now') WHERE id = ?").bind(lead.id).run()
    } else {
      fallidos++
      if (errores.length < 3) errores.push(`${lead.nombre}: ${r.error}`)
    }
    await new Promise(res => setTimeout(res, 120)) // suave con el rate limit de Resend
  }

  return json({ enviados, fallidos, errores })
}
