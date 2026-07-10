import { json, type Env } from '../../_lib/auth'
import { personalizar, renderHtml, type Lead } from '../../_lib/email'

// POST /api/seguimiento/preview  { estado, asunto, cuerpo, ctaLabel, ctaUrl }
// Renderiza el correo REAL (mismo motor que el envío) usando el primer lead con
// email del estado dado, o un lead de ejemplo si no hay ninguno. Así la vista
// previa es idéntica a lo que recibirá el cliente.
const EJEMPLO: Lead = {
  id: 0, nombre: 'Juan Pérez', email: 'ejemplo@correo.com', empresa: 'Su Negocio',
  telefono: null, industria: 'su sector', plan_interes: 'el servicio que consultó',
  necesidad: null, siguiente_accion: null, canal: 'otro',
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  let body: { estado?: string; asunto?: string; cuerpo?: string; ctaLabel?: string; ctaUrl?: string }
  try { body = await ctx.request.json() } catch { return json({ error: 'JSON inválido' }, 400) }

  let lead = EJEMPLO
  if (body.estado) {
    const row = await ctx.env.DB.prepare(
      "SELECT id, nombre, email, empresa, telefono, industria, plan_interes, necesidad, siguiente_accion, canal FROM leads WHERE estado = ? AND email LIKE '%@%' ORDER BY created_at DESC LIMIT 1"
    ).bind(body.estado).first<Lead>()
    if (row) lead = row
  }

  return json({
    para: lead.nombre,
    asunto: personalizar(body.asunto ?? '', lead),
    html: renderHtml(body.cuerpo ?? '', lead, { ctaLabel: body.ctaLabel, ctaUrl: body.ctaUrl }),
  })
}
