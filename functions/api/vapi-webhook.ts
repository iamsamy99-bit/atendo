import { json, getConfig, type Env } from '../_lib/auth'
import { disponibilidadParaVoz } from '../_lib/calcom'

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
  // Solo llamadas salientes (Sofía Ventas):
  resultado?: string
  volver_cuando?: string
}

interface VapiToolCall {
  id?: string
  name?: string
  function?: { name?: string }
}

interface VapiMessage {
  type?: string
  call?: { id?: string; customer?: { number?: string } }
  customer?: { number?: string }
  analysis?: { structuredData?: VapiStructuredData; summary?: string }
  summary?: string
  // Vapi manda los tool calls en uno u otro campo según la versión del payload.
  toolCallList?: VapiToolCall[]
  toolCalls?: VapiToolCall[]
}

function extraerToolCalls(msg: VapiMessage): { id: string; name: string }[] {
  const raw = [...(msg.toolCallList ?? []), ...(msg.toolCalls ?? [])]
  const vistos = new Set<string>()
  const out: { id: string; name: string }[] = []
  for (const t of raw) {
    const id = t.id ?? ''
    const name = t.name ?? t.function?.name ?? ''
    if (!id || !name || vistos.has(id)) continue
    vistos.add(id)
    out.push({ id, name })
  }
  return out
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

// Si el call_id pertenece a una llamada saliente (tabla llamadas_ia), actualiza
// esa fila y el lead ligado en vez de crear un lead nuevo. Devuelve false si la
// llamada no es saliente (flujo entrante normal).
async function actualizarLlamadaSaliente(db: D1Database, msg: VapiMessage): Promise<boolean> {
  const callId = msg.call?.id
  if (!callId) return false
  const llamada = await db
    .prepare('SELECT id, lead_id FROM llamadas_ia WHERE call_id = ?')
    .bind(callId)
    .first<{ id: number; lead_id: number }>()
  if (!llamada) return false

  const sd = msg.analysis?.structuredData ?? {}
  const resumen = msg.analysis?.summary ?? msg.summary ?? null
  const quiereDemo = String(sd.quiere_demo).toLowerCase() === 'si' || String(sd.quiere_demo).toLowerCase() === 'sí' || sd.quiere_demo === true
  const resultado = sd.resultado || (quiereDemo ? 'demo_agendada' : 'sin_conversacion')

  await db.prepare(
    "UPDATE llamadas_ia SET estado = 'completada', resultado = ?, resumen = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(resultado, resumen, llamada.id).run()

  const lead = await db.prepare('SELECT estado, notas FROM leads WHERE id = ?')
    .bind(llamada.lead_id).first<{ estado: string; notas: string | null }>()
  if (!lead) return true

  // Avanzar el pipeline sin degradar leads que ya iban más adelante.
  const tempranos = ['nuevo', 'contactado', 'calificado']
  let nuevoEstado: string | null = null
  if (resultado === 'demo_agendada' && tempranos.includes(lead.estado)) nuevoEstado = 'demo_agendada'
  else if (['interesado', 'volver_a_llamar', 'no_interesado'].includes(resultado) && lead.estado === 'nuevo') nuevoEstado = 'contactado'

  const acciones: Record<string, string> = {
    demo_agendada: 'Demo agendada por Sofía IA — confirmar por WhatsApp',
    interesado: 'Dar seguimiento (interesado en llamada IA)',
    volver_a_llamar: `Volver a llamar${sd.volver_cuando ? `: ${sd.volver_cuando}` : ''}`,
    no_llamar: 'NO VOLVER A LLAMAR (lo pidió en llamada IA)',
  }
  const fecha = new Date().toISOString().slice(0, 10)
  const nota = [`[Llamada IA ${fecha}] Resultado: ${resultado}`,
    sd.telefono ? `WhatsApp dictado: ${sd.telefono}` : null,
    resumen].filter(Boolean).join('\n')

  await db.prepare(
    `UPDATE leads SET estado = COALESCE(?, estado), siguiente_accion = COALESCE(?, siguiente_accion),
      notas = CASE WHEN notas IS NULL OR notas = '' THEN ? ELSE notas || char(10) || char(10) || ? END,
      updated_at = datetime('now') WHERE id = ?`
  ).bind(nuevoEstado, acciones[resultado] ?? null, nota, nota, llamada.lead_id).run()
  return true
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
    // Lo importante primero: registrar en el CRM. Si la llamada fue saliente
    // (Sofía Ventas), actualiza el lead existente; si no, crea el lead entrante.
    try {
      const fueSaliente = await actualizarLlamadaSaliente(ctx.env.DB, msg)
      if (!fueSaliente) await guardarLead(ctx.env.DB, msg)
    } catch (err) { console.error('[vapi-webhook] end-of-call:', err) }
    // Copia a Make (Telegram/email) sin bloquear la respuesta a Vapi.
    ctx.waitUntil(forward().catch(err => console.error('[vapi-webhook] forward:', err)))
    return json({ ok: true })
  }

  // consultarDisponibilidad: Sofía espera los horarios REALES. Se responden
  // directo desde Cal.com (sin Make). Si venían mezclados otros tool calls
  // (captureLeadInfo/agendarDemo), esos se reenvían a Make para el Telegram.
  if (msg.type === 'tool-calls') {
    const calls = extraerToolCalls(msg)
    const dispo = calls.filter(c => c.name === 'consultarDisponibilidad')
    if (dispo.length > 0) {
      if (calls.length > dispo.length) {
        ctx.waitUntil(forward().catch(err => console.error('[vapi-webhook] forward tools:', err)))
      }
      let texto: string
      try {
        if (!ctx.env.CALCOM_API_KEY) throw new Error('CALCOM_API_KEY sin configurar')
        texto = await disponibilidadParaVoz(ctx.env.CALCOM_API_KEY)
      } catch (err) {
        console.error('[vapi-webhook] calcom:', err)
        texto = 'No pude consultar la agenda en este momento. Puedo tomar tus datos y te confirmamos el horario por WhatsApp.'
      }
      return json({ results: dispo.map(c => ({ toolCallId: c.id, result: texto })) })
    }
  }

  // Resto de tool-calls (captureLeadInfo/agendarDemo → Telegram "LEAD EN VIVO")
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
