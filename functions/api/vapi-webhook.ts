import { json, getConfig, type Env } from '../_lib/auth'

// Webhook de Vapi (Sofía). Recibe end-of-call-report y tool-calls DIRECTO
// de Vapi, guarda el lead en el CRM (D1) y reenvía una copia a Make para
// que Telegram/email/consultarDisponibilidad sigan funcionando igual.
// El CRM ya no depende de Make: si Make falla, el lead se guarda de todos modos.
//
// Auth: Vapi manda el header x-vapi-secret (config.vapi_secret).

interface VapiStructuredData {
  nombre?: string
  telefono?: string
  ciudad?: string
  interes?: string
  quiere_demo?: boolean | string
  tipo_negocio?: string
}

interface VapiMessage {
  type?: string
  call?: { id?: string; customer?: { number?: string } }
  customer?: { number?: string }
  analysis?: { structuredData?: VapiStructuredData; summary?: string }
  summary?: string
}

async function guardarLead(db: D1Database, msg: VapiMessage): Promise<void> {
  const sd = msg.analysis?.structuredData ?? {}
  const callId = msg.call?.id ?? ''
  const origen = callId ? `vapi:${callId}` : 'vapi:sin-id'
  const telefono = sd.telefono || msg.call?.customer?.number || msg.customer?.number || null
  const nombre = (sd.nombre || '').trim() || (telefono ? `Llamada ${telefono}` : 'Llamada sin datos')
  const resumen = msg.analysis?.summary ?? msg.summary ?? null
  const quiereDemo = sd.quiere_demo === true || String(sd.quiere_demo).toLowerCase() === 'true' || String(sd.quiere_demo).toLowerCase() === 'si' || String(sd.quiere_demo).toLowerCase() === 'sí'
  const notas = [sd.ciudad ? `Ciudad: ${sd.ciudad}` : null, resumen ? `Resumen de llamada: ${resumen}` : null]
    .filter(Boolean).join('\n') || null

  // Idempotencia: si Vapi reintenta el webhook, no duplicar el lead.
  const existente = callId
    ? await db.prepare('SELECT id FROM leads WHERE origen = ?').bind(origen).first<{ id: number }>()
    : null

  if (existente) {
    // COALESCE: un reintento con menos datos nunca borra lo ya capturado.
    await db.prepare(
      `UPDATE leads SET nombre = COALESCE(?, nombre), telefono = COALESCE(?, telefono),
        industria = COALESCE(?, industria), necesidad = COALESCE(?, necesidad),
        siguiente_accion = COALESCE(?, siguiente_accion), notas = COALESCE(?, notas),
        updated_at = datetime('now') WHERE id = ?`
    ).bind(sd.nombre?.trim() || null, telefono, sd.tipo_negocio ?? null, sd.interes ?? null,
      quiereDemo ? 'Agendar demo' : null, notas, existente.id).run()
    return
  }

  await db.prepare(
    `INSERT INTO leads (canal, origen, nombre, telefono, industria, necesidad, siguiente_accion, idioma, estado, notas)
     VALUES ('telefono', ?, ?, ?, ?, ?, ?, 'es', 'nuevo', ?)`
  ).bind(origen, nombre, telefono, sd.tipo_negocio ?? null, sd.interes ?? null,
    quiereDemo ? 'Agendar demo' : 'Dar seguimiento', notas).run()
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const secret = await getConfig(ctx.env.DB, 'vapi_secret')
  if (!secret || ctx.request.headers.get('x-vapi-secret') !== secret) {
    return json({ error: 'No autorizado' }, 401)
  }

  const raw = await ctx.request.text()
  let msg: VapiMessage = {}
  try { msg = (JSON.parse(raw) as { message?: VapiMessage }).message ?? {} } catch { /* payload no-JSON: solo reenviar */ }

  const makeUrl = await getConfig(ctx.env.DB, 'make_forward_url')
  const forward = () => makeUrl
    ? fetch(makeUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw })
    : Promise.resolve(new Response(null, { status: 204 }))

  if (msg.type === 'end-of-call-report') {
    // Lo importante primero: guardar el lead en el CRM.
    try { await guardarLead(ctx.env.DB, msg) } catch (err) { console.error('[vapi-webhook] guardarLead:', err) }
    // Copia a Make (Telegram/email) sin bloquear la respuesta a Vapi.
    ctx.waitUntil(forward().catch(err => console.error('[vapi-webhook] forward:', err)))
    return json({ ok: true })
  }

  // tool-calls (consultarDisponibilidad necesita la respuesta de Make con los
  // horarios; captureLeadInfo/agendarDemo disparan el Telegram "LEAD EN VIVO")
  // y cualquier otro evento: proxy transparente a Make.
  try {
    const res = await forward()
    const body = await res.text()
    return new Response(body || '{}', {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (err) {
    console.error('[vapi-webhook] proxy:', err)
    return json({ ok: false }, 502)
  }
}
