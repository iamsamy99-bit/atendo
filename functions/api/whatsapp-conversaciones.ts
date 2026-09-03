/// <reference types="@cloudflare/workers-types" />
// Bandeja de WhatsApp para el panel: sin esto, todo lo que produce el bot
// (conversaciones, citas y sobre todo los handoff, donde el cliente pidió
// hablar con una persona) queda invisible en la base de datos.
import { json, type Env } from '../_lib/auth'

interface ConversacionRow {
  id: number
  wa_id: string
  telefono: string
  nombre: string | null
  estado: string
  lead_id: number | null
  last_message_at: string | null
  updated_at: string | null
}

/** GET /api/whatsapp-conversaciones            → lista de conversaciones
 *  GET /api/whatsapp-conversaciones?id=123     → mensajes de una conversación
 *  GET /api/whatsapp-conversaciones?citas=1    → citas creadas por el bot     */
export const onRequestGet: PagesFunction<Env> = async ctx => {
  const url = new URL(ctx.request.url)
  const id = url.searchParams.get('id')

  if (url.searchParams.get('citas')) {
    const { results } = await ctx.env.DB.prepare(`
      SELECT a.id, a.source, a.conversation_id, a.lead_id, a.customer_name,
             a.customer_phone, a.customer_email, a.status, a.notes, a.created_at
      FROM appointments a
      ORDER BY a.created_at DESC
      LIMIT 200
    `).all()
    return json(results ?? [])
  }

  if (id) {
    const conv = await ctx.env.DB.prepare(`
      SELECT id, wa_id, telefono, nombre, estado, lead_id, last_message_at, updated_at
      FROM whatsapp_conversations WHERE id = ?
    `).bind(id).first<ConversacionRow>()
    if (!conv) return json({ error: 'Conversación no encontrada' }, 404)

    const { results: mensajes } = await ctx.env.DB.prepare(`
      SELECT id, created_at, direction, role, kind, text, delivered_at, read_at
      FROM whatsapp_messages
      WHERE conversation_id = ?
      ORDER BY id ASC
      LIMIT 500
    `).bind(id).all()
    return json({ ...conv, mensajes: mensajes ?? [] })
  }

  // Lista: se ordena poniendo primero lo que necesita atención humana.
  const { results } = await ctx.env.DB.prepare(`
    SELECT c.id, c.wa_id, c.telefono, c.nombre, c.estado, c.lead_id,
           c.last_message_at, c.updated_at,
           (SELECT COUNT(*) FROM whatsapp_messages m WHERE m.conversation_id = c.id) AS mensajes,
           (SELECT m.text FROM whatsapp_messages m
             WHERE m.conversation_id = c.id AND m.role IN ('user','assistant')
             ORDER BY m.id DESC LIMIT 1) AS ultimo_texto,
           (SELECT m.role FROM whatsapp_messages m
             WHERE m.conversation_id = c.id AND m.role IN ('user','assistant')
             ORDER BY m.id DESC LIMIT 1) AS ultimo_role
    FROM whatsapp_conversations c
    ORDER BY CASE c.estado WHEN 'handoff' THEN 0 ELSE 1 END,
             COALESCE(c.last_message_at, c.updated_at) DESC
    LIMIT 300
  `).all()
  return json(results ?? [])
}

/** PATCH /api/whatsapp-conversaciones?id=123  { estado }
 *  Sirve para cerrar un handoff una vez atendido. */
export const onRequestPatch: PagesFunction<Env> = async ctx => {
  const url = new URL(ctx.request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Falta id' }, 400)

  let body: { estado?: string }
  try { body = await ctx.request.json() } catch { return json({ error: 'JSON inválido' }, 400) }

  const validos = ['activa', 'cerrada', 'handoff']
  if (!body.estado || !validos.includes(body.estado)) {
    return json({ error: `estado debe ser uno de: ${validos.join(', ')}` }, 400)
  }

  await ctx.env.DB.prepare(
    "UPDATE whatsapp_conversations SET estado = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(body.estado, id).run()

  const conv = await ctx.env.DB.prepare(
    'SELECT id, wa_id, telefono, nombre, estado, lead_id, last_message_at, updated_at FROM whatsapp_conversations WHERE id = ?'
  ).bind(id).first<ConversacionRow>()
  return json(conv)
}
