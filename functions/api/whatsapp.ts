import { getConfig, json, type Env } from '../_lib/auth'
import { enviarCorreo, renderHtml, type Lead } from '../_lib/email'
import { parseIncomingMessages, sendTextMessage, verifySignature, verifyWebhook } from '../_lib/meta-whatsapp'
import { composeReply, defaultBotConfig, type BotConfig, type ConversationTurn } from '../_lib/whatsapp-bot'

interface ConversationRow {
  id: number
  wa_id: string
  telefono: string
  nombre: string | null
  estado: 'activa' | 'cerrada' | 'handoff'
  lead_id: number | null
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

async function loadBotConfig(db: D1Database): Promise<BotConfig> {
  const row = await db.prepare(`
    SELECT business_name, assistant_name, tone, timezone, booking_url, contact_email,
      system_prompt, faq_json, pricing_json, discovery_questions_json
    FROM bot_configs WHERE scope = 'default' LIMIT 1
  `).first<{
    business_name: string
    assistant_name: string
    tone: string
    timezone: string
    booking_url: string | null
    contact_email: string | null
    system_prompt: string | null
    faq_json: string | null
    pricing_json: string | null
    discovery_questions_json: string | null
  }>()

  if (!row) return defaultBotConfig()
  return defaultBotConfig({
    businessName: row.business_name,
    assistantName: row.assistant_name,
    tone: row.tone,
    timezone: row.timezone,
    bookingUrl: row.booking_url ?? undefined,
    contactEmail: row.contact_email,
    systemPrompt: row.system_prompt,
    faq: safeJsonParse<Record<string, string>>(row.faq_json, {}),
    pricing: safeJsonParse<BotConfig['pricing']>(row.pricing_json, {}),
    discoveryQuestions: safeJsonParse<string[]>(row.discovery_questions_json, []),
  })
}

async function upsertConversation(db: D1Database, waId: string, profileName?: string): Promise<ConversationRow> {
  const existing = await db.prepare(`
    SELECT id, wa_id, telefono, nombre, estado, lead_id
    FROM whatsapp_conversations
    WHERE wa_id = ?
  `).bind(waId).first<ConversationRow>()
  if (existing) {
    if (profileName && profileName !== existing.nombre) {
      await db.prepare(`
        UPDATE whatsapp_conversations
        SET nombre = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(profileName, existing.id).run()
      existing.nombre = profileName
    }
    return existing
  }

  const created = await db.prepare(`
    INSERT INTO whatsapp_conversations (wa_id, telefono, nombre, last_message_at)
    VALUES (?, ?, ?, datetime('now'))
    RETURNING id, wa_id, telefono, nombre, estado, lead_id
  `).bind(waId, waId, profileName ?? null).first<ConversationRow>()
  if (!created) throw new Error('No se pudo crear la conversación')
  return created
}

async function recordMessage(
  db: D1Database,
  opts: {
    conversationId: number
    metaMessageId?: string
    direction: 'in' | 'out'
    role: 'user' | 'assistant' | 'system'
    kind?: 'text' | 'interactive' | 'template' | 'system'
    text: string
    payloadJson?: string
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO whatsapp_messages (conversation_id, meta_message_id, direction, role, kind, text, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    opts.conversationId,
    opts.metaMessageId ?? null,
    opts.direction,
    opts.role,
    opts.kind ?? 'text',
    opts.text,
    opts.payloadJson ?? null
  ).run()
  await db.prepare(`
    UPDATE whatsapp_conversations
    SET updated_at = datetime('now'), last_message_at = datetime('now')
    WHERE id = ?
  `).bind(opts.conversationId).run()
}

async function markStatuses(db: D1Database, statuses: Array<{ id: string; status: string; timestamp?: string }>): Promise<void> {
  for (const status of statuses) {
    // Meta manda el timestamp como epoch en segundos ("1755350400"); el resto
    // de las columnas de fecha guardan texto de datetime('now'), asi que hay
    // que convertirlo o quedan valores incomparables entre si.
    const column = status.status === 'delivered' ? 'delivered_at' : status.status === 'read' ? 'read_at' : null
    if (!column) continue
    await db.prepare(
      `UPDATE whatsapp_messages
       SET ${column} = COALESCE(datetime(?, 'unixepoch'), datetime('now'))
       WHERE meta_message_id = ?`
    ).bind(status.timestamp ?? null, status.id).run()
  }
}

/**
 * Meta reintenta el webhook cuando no recibe 200 dentro de su timeout, y este
 * handler hace la llamada a OpenAI, el envio por WhatsApp y el correo en linea
 * antes de responder. Sin esta guarda, cualquier request lenta terminaba
 * respondiendole dos veces al cliente.
 */
async function alreadyProcessed(db: D1Database, metaMessageId?: string): Promise<boolean> {
  if (!metaMessageId) return false
  const row = await db.prepare(
    'SELECT id FROM whatsapp_messages WHERE meta_message_id = ? LIMIT 1'
  ).bind(metaMessageId).first<{ id: number }>()
  return !!row
}

async function loadHistory(db: D1Database, conversationId: number): Promise<ConversationTurn[]> {
  const { results } = await db.prepare(`
    SELECT role, text
    FROM whatsapp_messages
    WHERE conversation_id = ?
      AND role IN ('user', 'assistant')
    ORDER BY id DESC
    LIMIT 12
  `).bind(conversationId).all<{ role: 'user' | 'assistant'; text: string }>()
  return (results ?? []).reverse().filter(r => !!r.text).map(r => ({ role: r.role, text: r.text }))
}

async function applyLeadUpdates(
  db: D1Database,
  leadId: number,
  updates: NonNullable<Awaited<ReturnType<typeof composeReply>>['leadUpdates']>,
  incomingText: string
): Promise<void> {
  const sets: string[] = []
  const values: Array<string | number | null> = []
  const allowed = ['nombre', 'email', 'empresa', 'industria', 'necesidad', 'plan_interes', 'siguiente_accion', 'estado'] as const

  for (const key of allowed) {
    const value = updates[key]
    if (typeof value === 'string' && value.trim()) {
      sets.push(`${key} = ?`)
      values.push(value.trim())
    }
  }

  sets.push(`notas = CASE
      WHEN notas IS NULL OR notas = '' THEN ?
      ELSE notas || char(10) || char(10) || ?
    END`)
  values.push(`[WhatsApp] Cliente: ${incomingText}`, `[WhatsApp] Cliente: ${incomingText}`)
  sets.push(`updated_at = datetime('now')`)
  values.push(leadId)
  await db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run()
}

async function createPendingAppointment(
  db: D1Database,
  conversationId: number,
  leadId: number | null,
  convo: ConversationRow,
  reply: Awaited<ReturnType<typeof composeReply>>
): Promise<void> {
  const requested = reply.bookingRequest?.requestedTimeText?.trim()
  if (!requested) return

  const existing = await db.prepare(`
    SELECT id FROM appointments
    WHERE conversation_id = ? AND status = 'pendiente' AND notes = ?
    LIMIT 1
  `).bind(conversationId, requested).first<{ id: number }>()
  if (existing) return

  await db.prepare(`
    INSERT INTO appointments (
      source, conversation_id, lead_id, customer_name, customer_phone, customer_email,
      timezone, status, quote_json, notes
    ) VALUES ('whatsapp', ?, ?, ?, ?, ?, 'America/Mexico_City', 'pendiente', ?, ?)
  `).bind(
    conversationId,
    leadId,
    reply.bookingRequest?.customerName || convo.nombre || `WhatsApp ${convo.telefono}`,
    convo.telefono,
    reply.bookingRequest?.customerEmail ?? null,
    reply.quoteJson ?? null,
    requested
  ).run()
}

async function upsertLeadFromConversation(db: D1Database, convo: ConversationRow): Promise<number | null> {
  if (convo.lead_id) return convo.lead_id

  // Un lead que ya llego por la landing, Calendly o Vapi y luego escribe por
  // WhatsApp debe ligarse al registro existente, no crear uno paralelo.
  // Mismo criterio que usa functions/api/prospectos.ts.
  const existing = await db.prepare(
    'SELECT id FROM leads WHERE telefono = ? ORDER BY id DESC LIMIT 1'
  ).bind(convo.telefono).first<{ id: number }>()
  if (existing) {
    await db.prepare('UPDATE whatsapp_conversations SET lead_id = ? WHERE id = ?')
      .bind(existing.id, convo.id).run()
    return existing.id
  }

  const lead = await db.prepare(`
    INSERT INTO leads (canal, origen, nombre, telefono, estado, idioma)
    VALUES ('whatsapp', ?, ?, ?, 'nuevo', 'es')
    RETURNING id
  `).bind(`meta:${convo.wa_id}`, convo.nombre || `WhatsApp ${convo.telefono}`, convo.telefono).first<{ id: number }>()
  if (!lead) return null
  await db.prepare('UPDATE whatsapp_conversations SET lead_id = ? WHERE id = ?').bind(lead.id, convo.id).run()
  return lead.id
}

async function maybeSendConfirmationEmail(
  db: D1Database,
  resendApiKey: string | undefined,
  leadId: number | null,
  botConfig: BotConfig,
  replyText: string
): Promise<void> {
  if (!resendApiKey || !leadId) return
  if (!replyText.includes('quedo confirmada')) return

  const lead = await db.prepare(`
    SELECT id, nombre, email, empresa, telefono, industria, plan_interes, necesidad, siguiente_accion, canal
    FROM leads WHERE id = ?
  `).bind(leadId).first<Lead>()
  if (!lead?.email) return

  const html = renderHtml(
    `Hola {nombre},\n\nTu cita con ${botConfig.businessName} ya quedo confirmada.\n\nTe enviaremos cualquier detalle adicional por este mismo canal.`,
    lead,
    { ctaLabel: 'Ver Atendo', ctaUrl: 'https://atendo.lat' }
  )
  await enviarCorreo(resendApiKey, {
    to: lead.email,
    subject: 'Confirmacion de cita con Atendo',
    html,
  })
}

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const token = await getConfig(ctx.env.DB, 'meta_whatsapp_verify_token')
  return verifyWebhook(ctx.request, token) ?? json({ error: 'Solicitud invalida' }, 400)
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const { raw, payload, messages, statuses } = await parseIncomingMessages(ctx.request)

  // La ruta es pública (Meta no manda cookie), así que la firma HMAC es lo
  // único que distingue un webhook real de uno forjado. Se valida antes de
  // tocar la base o de enviar cualquier mensaje.
  const appSecret = ctx.env.META_WHATSAPP_APP_SECRET
    ?? await getConfig(ctx.env.DB, 'meta_whatsapp_app_secret')
  const validSignature = await verifySignature(
    raw,
    ctx.request.headers.get('x-hub-signature-256'),
    appSecret
  )
  if (!validSignature) {
    console.error('[whatsapp] firma invalida o secreto no configurado; webhook rechazado')
    return json({ error: 'Firma invalida' }, 403)
  }

  await ctx.env.DB.prepare(`
    INSERT INTO whatsapp_events (event_type, meta_object, payload_json)
    VALUES (?, ?, ?)
  `).bind(messages.length > 0 ? 'message' : 'status', payload.object ?? null, raw).run()

  if (statuses.length > 0) await markStatuses(ctx.env.DB, statuses)
  if (messages.length === 0) return json({ ok: true })

  const accessToken = await getConfig(ctx.env.DB, 'meta_whatsapp_access_token')
  const phoneNumberId = await getConfig(ctx.env.DB, 'meta_whatsapp_phone_number_id')
  const botConfig = await loadBotConfig(ctx.env.DB)

  for (const incoming of messages) {
    if (await alreadyProcessed(ctx.env.DB, incoming.messageId)) {
      console.log('[whatsapp] mensaje ya procesado, se ignora el reintento:', incoming.messageId)
      continue
    }

    const conversation = await upsertConversation(ctx.env.DB, incoming.from, incoming.profileName)
    const leadId = await upsertLeadFromConversation(ctx.env.DB, conversation)

    // El historial se carga ANTES de registrar el mensaje actual: si no, el
    // texto entrante aparecia duplicado (como "mensaje actual" y como ultima
    // linea del historial) y consumia uno de los 12 turnos disponibles.
    const history = await loadHistory(ctx.env.DB, conversation.id)

    await recordMessage(ctx.env.DB, {
      conversationId: conversation.id,
      metaMessageId: incoming.messageId,
      direction: 'in',
      role: 'user',
      text: incoming.text,
    })

    const reply = await composeReply(
      incoming.text,
      botConfig,
      history,
      ctx.env.CALCOM_API_KEY,
      ctx.env.OPENAI_API_KEY,
      ctx.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    )

    if (leadId) {
      if (reply.leadUpdates) await applyLeadUpdates(ctx.env.DB, leadId, reply.leadUpdates, incoming.text)
      else {
        await ctx.env.DB.prepare(`
          UPDATE leads
          SET notas = CASE
              WHEN notas IS NULL OR notas = '' THEN ?
              ELSE notas || char(10) || char(10) || ?
            END,
            updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          `[WhatsApp] Cliente: ${incoming.text}`,
          `[WhatsApp] Cliente: ${incoming.text}`,
          leadId
        ).run()
      }
    }

    if (reply.handoff) {
      await ctx.env.DB.prepare(`
        UPDATE whatsapp_conversations
        SET estado = 'handoff', updated_at = datetime('now')
        WHERE id = ?
      `).bind(conversation.id).run()
    }

    await createPendingAppointment(ctx.env.DB, conversation.id, leadId, conversation, reply)

    if (accessToken && phoneNumberId) {
      const sent = await sendTextMessage(phoneNumberId, accessToken, incoming.from, reply.text)
      if (sent.ok) {
        await recordMessage(ctx.env.DB, {
          conversationId: conversation.id,
          metaMessageId: sent.id,
          direction: 'out',
          role: 'assistant',
          text: reply.text,
          payloadJson: reply.quoteJson,
        })
      } else {
        // Un envio que Meta rechazo (ventana de 24h vencida, numero invalido,
        // token caido) no puede guardarse como turno normal del asistente: el
        // historial se lo devolveria al modelo como si el cliente lo hubiera
        // leido. Se registra como evento de sistema.
        console.error('[whatsapp] send failed:', sent.error)
        await recordMessage(ctx.env.DB, {
          conversationId: conversation.id,
          direction: 'out',
          role: 'system',
          kind: 'system',
          text: `[no entregado] ${sent.error ?? 'error desconocido'}: ${reply.text}`,
          payloadJson: reply.quoteJson,
        })
      }
    } else {
      await recordMessage(ctx.env.DB, {
        conversationId: conversation.id,
        direction: 'out',
        role: 'assistant',
        text: reply.text,
        payloadJson: reply.quoteJson,
      })
    }

    await maybeSendConfirmationEmail(ctx.env.DB, ctx.env.RESEND_API_KEY, leadId, botConfig, reply.text)
  }

  return json({ ok: true })
}
