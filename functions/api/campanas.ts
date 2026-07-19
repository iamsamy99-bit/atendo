import { json, type Env } from '../_lib/auth'

// Campañas de llamadas salientes con IA: cola en D1 que el worker-campanas
// consume por cron (lun-vie, horario laboral Hermosillo, ver worker-campanas/).
// GET    → estado de la cola + actividad de hoy
// POST   { lead_ids: number[] } → agrega leads a la cola (ignora duplicados pendientes)
// DELETE → cancela todos los pendientes

interface ColaRow {
  id: number
  created_at: string
  lead_id: number
  estado: string
  detalle: string | null
  nombre: string
  empresa: string | null
  telefono: string | null
}

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const { results: pendientes } = await ctx.env.DB.prepare(`
    SELECT c.id, c.created_at, c.lead_id, c.estado, c.detalle, l.nombre, l.empresa, l.telefono
    FROM campana_cola c JOIN leads l ON l.id = c.lead_id
    WHERE c.estado = 'pendiente' ORDER BY c.created_at LIMIT 200
  `).all<ColaRow>()

  const hoy = await ctx.env.DB.prepare(`
    SELECT COUNT(*) AS n FROM campana_cola
    WHERE estado = 'llamada_iniciada' AND date(created_at) = date('now')
  `).first<{ n: number }>()

  return json({ pendientes, iniciadas_hoy: hoy?.n ?? 0 })
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  let body: { lead_ids?: unknown } = {}
  try { body = await ctx.request.json() } catch { /* → 400 abajo */ }
  const ids = Array.isArray(body.lead_ids) ? body.lead_ids.filter(n => Number.isInteger(n)) as number[] : []
  if (ids.length === 0) return json({ error: 'lead_ids requerido (arreglo de ids)' }, 400)
  if (ids.length > 200) return json({ error: 'Máximo 200 leads por campaña' }, 400)

  let agregados = 0, omitidos = 0
  for (const id of ids) {
    const lead = await ctx.env.DB.prepare('SELECT id, telefono FROM leads WHERE id = ?').bind(id).first<{ id: number; telefono: string | null }>()
    const yaEnCola = lead && await ctx.env.DB
      .prepare("SELECT id FROM campana_cola WHERE lead_id = ? AND estado = 'pendiente'").bind(id).first()
    if (!lead || !lead.telefono || yaEnCola) { omitidos++; continue }
    await ctx.env.DB.prepare('INSERT INTO campana_cola (lead_id) VALUES (?)').bind(id).run()
    agregados++
  }
  return json({ ok: true, agregados, omitidos })
}

export const onRequestDelete: PagesFunction<Env> = async ctx => {
  const r = await ctx.env.DB.prepare("DELETE FROM campana_cola WHERE estado = 'pendiente'").run()
  return json({ ok: true, cancelados: r.meta.changes ?? 0 })
}
