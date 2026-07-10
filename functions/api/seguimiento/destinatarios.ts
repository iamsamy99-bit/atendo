import { json, type Env } from '../../_lib/auth'

// GET /api/seguimiento/destinatarios?estado=contactado
// Devuelve los leads de ese estado, separando los que tienen email de los que no.
export const onRequestGet: PagesFunction<Env> = async ctx => {
  const estado = new URL(ctx.request.url).searchParams.get('estado') ?? 'contactado'
  const { results } = await ctx.env.DB
    .prepare('SELECT id, nombre, email, empresa, plan_interes FROM leads WHERE estado = ? ORDER BY created_at DESC')
    .bind(estado)
    .all<{ id: number; nombre: string; email: string | null; empresa: string | null; plan_interes: string | null }>()

  const conEmail = results.filter(r => r.email && r.email.includes('@'))
  const sinEmail = results.filter(r => !r.email || !r.email.includes('@'))
  return json({
    total: results.length,
    con_email: conEmail.length,
    sin_email: sinEmail.length,
    destinatarios: conEmail,
    sin_email_lista: sinEmail.map(r => r.nombre),
  })
}
