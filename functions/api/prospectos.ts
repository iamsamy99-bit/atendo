import { json, type Env } from '../_lib/auth'

interface LeadRow {
  id: number
  created_at: string
  updated_at: string
  canal: string
  origen: string | null
  nombre: string
  telefono: string | null
  email: string | null
  empresa: string | null
  industria: string | null
  necesidad: string | null
  volumen_estimado: string | null
  plan_interes: string | null
  idioma: string
  siguiente_accion: string | null
  estado: string
  motivo_perdida: string | null
  notas: string | null
  cliente_id: number | null
}

// GET /api/prospectos -> Obtiene todos los prospectos (leads con origen = 'prospeccion')
export const onRequestGet: PagesFunction<Env> = async ctx => {
  try {
    const { results } = await ctx.env.DB.prepare(`
      SELECT * FROM leads WHERE origen = 'prospeccion' ORDER BY created_at DESC
    `).all<LeadRow>()
    return json(results)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error al obtener prospectos' }, 500)
  }
}

// POST /api/prospectos -> Importa prospectos en lote
export const onRequestPost: PagesFunction<Env> = async ctx => {
  let body: { prospects?: any[] } = {}
  try {
    body = await ctx.request.json()
  } catch {
    return json({ error: 'JSON de entrada inválido' }, 400)
  }

  const prospects = Array.isArray(body.prospects) ? body.prospects : []
  if (prospects.length === 0) {
    return json({ error: 'La lista de prospectos no puede estar vacía' }, 400)
  }

  let agregados = 0
  let omitidos = 0

  for (const p of prospects) {
    const nombre = String(p.nombre || '').trim()
    const empresa = String(p.empresa || '').trim()
    const telefono = String(p.telefono || '').trim()
    const email = String(p.email || '').trim()
    const industria = String(p.industria || '').trim()
    const necesidad = String(p.necesidad || '').trim()
    const plan_interes = String(p.plan_interes || 'Esencial').trim()

    if (!nombre) {
      omitidos++
      continue
    }

    // Evitar duplicados por teléfono o email en prospectos
    let yaExiste = false
    if (telefono) {
      const row = await ctx.env.DB.prepare('SELECT id FROM leads WHERE telefono = ?').bind(telefono).first()
      if (row) yaExiste = true
    }
    if (!yaExiste && email) {
      const row = await ctx.env.DB.prepare('SELECT id FROM leads WHERE email = ?').bind(email).first()
      if (row) yaExiste = true
    }

    if (yaExiste) {
      omitidos++
      continue
    }

    try {
      await ctx.env.DB.prepare(`
        INSERT INTO leads (nombre, empresa, telefono, email, industria, necesidad, plan_interes, origen, canal, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'prospeccion', 'otro', 'nuevo')
      `).bind(
        nombre,
        empresa || null,
        telefono || null,
        email || null,
        industria || null,
        necesidad || null,
        plan_interes
      ).run()
      agregados++
    } catch {
      omitidos++
    }
  }

  return json({ ok: true, agregados, omitidos })
}
