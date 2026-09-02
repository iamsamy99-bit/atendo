import { json, type Env } from '../../_lib/auth'
import { personalizar, renderHtml, enviarCorreo, type Lead } from '../../_lib/email'

// POST /api/prospectos/enviar-email
// Body: { leadId: number, asunto: string, cuerpo: string, ctaLabel?: string, ctaUrl?: string }
export const onRequestPost: PagesFunction<Env> = async ctx => {
  const apiKey = ctx.env.RESEND_API_KEY
  if (!apiKey) return json({ error: 'Falta configurar RESEND_API_KEY en el servidor' }, 500)

  let body: { leadId?: number; asunto?: string; cuerpo?: string; ctaLabel?: string; ctaUrl?: string }
  try {
    body = await ctx.request.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  const leadId = Number(body.leadId)
  const asunto = String(body.asunto ?? '').trim()
  const cuerpo = String(body.cuerpo ?? '').trim()
  const ctaLabel = String(body.ctaLabel ?? '').trim()
  const ctaUrl = String(body.ctaUrl ?? '').trim()

  if (!leadId || !asunto || !cuerpo) {
    return json({ error: 'Faltan leadId, asunto o cuerpo' }, 400)
  }

  // Obtener lead de la base de datos
  const lead = await ctx.env.DB.prepare(`
    SELECT id, nombre, email, empresa, telefono, industria, plan_interes, necesidad, siguiente_accion, canal
    FROM leads WHERE id = ?
  `).bind(leadId).first<Lead>()

  if (!lead) {
    return json({ error: 'Lead no encontrado' }, 404)
  }

  if (!lead.email || !lead.email.includes('@')) {
    return json({ error: 'El lead no tiene un correo electrónico válido' }, 400)
  }

  const cta = ctaLabel && ctaUrl ? { ctaLabel, ctaUrl } : undefined

  // Personalizar y enviar correo
  const subject = personalizar(asunto, lead)
  const html = renderHtml(cuerpo, lead, cta)

  const r = await enviarCorreo(apiKey, {
    to: lead.email,
    subject,
    html,
  })

  // Guardar en la tabla seguimientos
  try {
    await ctx.env.DB.prepare(`
      INSERT INTO seguimientos (lead_id, email, asunto, estado, origen, error, resend_id)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `).bind(
      lead.id,
      lead.email,
      subject,
      r.ok ? 'enviado' : 'fallido',
      r.error ?? null,
      r.id ?? null
    ).run()

    if (r.ok) {
      // Marcar al lead como 'contactado' si estaba 'nuevo' y actualizar ultimo_seguimiento_at
      await ctx.env.DB.prepare(`
        UPDATE leads
        SET estado = CASE WHEN estado = 'nuevo' THEN 'contactado' ELSE estado END,
            ultimo_seguimiento_at = datetime('now')
        WHERE id = ?
      `).bind(lead.id).run()
    }
  } catch (dbErr) {
    console.error('Error al guardar seguimiento en BD:', dbErr)
  }

  if (!r.ok) {
    return json({ error: r.error ?? 'Error desconocido al enviar correo' }, 500)
  }

  return json({ ok: true, message: 'Correo enviado correctamente' })
}
