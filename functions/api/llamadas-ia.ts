import { json, type Env } from '../_lib/auth'

// Llamadas salientes con IA (Sofía Ventas vía Vapi).
// POST { lead_id }  → dispara la llamada al teléfono del lead y registra la fila.
// GET  ?lead_id=N   → historial de llamadas IA de ese lead.
// El resultado llega después por /api/vapi-webhook (end-of-call-report).

interface Lead {
  id: number
  nombre: string
  telefono: string | null
  empresa: string | null
  industria: string | null
  necesidad: string | null
  estado: string
}

export interface LlamadaIA {
  id: number
  created_at: string
  updated_at: string
  lead_id: number
  call_id: string
  telefono: string
  estado: 'iniciada' | 'completada' | 'fallida'
  resultado: string | null
  resumen: string | null
}

// Normaliza a E.164 con sesgo a México: 10 dígitos nacionales → +52.
// Acepta el formato viejo de celular 521XXXXXXXXXX (lo convierte a +52).
export function normalizarTelefono(raw: string): string | null {
  const limpio = raw.replace(/[^\d+]/g, '')
  let d = limpio.startsWith('+') ? limpio.slice(1) : limpio
  if (!/^\d{7,15}$/.test(d)) return null
  if (d.length === 13 && d.startsWith('521')) d = `52${d.slice(3)}`
  if (limpio.startsWith('+')) return `+${d}`
  if (d.length === 10) return `+52${d}`
  if (d.length === 12 && d.startsWith('52')) return `+${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

export const onRequestGet: PagesFunction<Env> = async ctx => {
  const leadId = new URL(ctx.request.url).searchParams.get('lead_id')
  if (!leadId || !/^\d+$/.test(leadId)) return json({ error: 'lead_id requerido' }, 400)
  const { results } = await ctx.env.DB
    .prepare('SELECT * FROM llamadas_ia WHERE lead_id = ? ORDER BY created_at DESC LIMIT 20')
    .bind(Number(leadId))
    .all<LlamadaIA>()
  return json(results)
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const { VAPI_PRIVATE_KEY, VAPI_OUTBOUND_ASSISTANT_ID, VAPI_OUTBOUND_PHONE_ID } = ctx.env
  if (!VAPI_PRIVATE_KEY || !VAPI_OUTBOUND_ASSISTANT_ID || !VAPI_OUTBOUND_PHONE_ID) {
    return json({ error: 'Llamadas IA sin configurar (faltan variables VAPI_* en el entorno)' }, 500)
  }

  let body: { lead_id?: number } = {}
  try { body = await ctx.request.json() } catch { /* body inválido → 400 abajo */ }
  if (!body.lead_id) return json({ error: 'lead_id requerido' }, 400)

  const lead = await ctx.env.DB
    .prepare('SELECT id, nombre, telefono, empresa, industria, necesidad, estado FROM leads WHERE id = ?')
    .bind(body.lead_id)
    .first<Lead>()
  if (!lead) return json({ error: 'Lead no encontrado' }, 404)
  if (!lead.telefono) return json({ error: 'El lead no tiene teléfono' }, 400)

  const numero = normalizarTelefono(lead.telefono)
  if (!numero) return json({ error: `Teléfono no válido: "${lead.telefono}". Usa 10 dígitos (MX) o formato +52…` }, 400)

  // Guard anti doble-marcado: si hay una llamada en curso reciente, no marcar otra vez.
  const enCurso = await ctx.env.DB
    .prepare("SELECT id FROM llamadas_ia WHERE lead_id = ? AND estado = 'iniciada' AND created_at > datetime('now', '-10 minutes')")
    .bind(lead.id)
    .first()
  if (enCurso) return json({ error: 'Ya hay una llamada en curso para este lead. Espera a que termine.' }, 409)

  const res = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: { authorization: `Bearer ${VAPI_PRIVATE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      assistantId: VAPI_OUTBOUND_ASSISTANT_ID,
      phoneNumberId: VAPI_OUTBOUND_PHONE_ID,
      customer: { number: numero, name: lead.empresa || lead.nombre },
      assistantOverrides: {
        variableValues: {
          nombreNegocio: lead.empresa || 'su negocio',
          nombreContacto: lead.nombre.startsWith('Llamada ') ? '' : lead.nombre,
          industria: lead.industria ?? '',
          contexto: (lead.necesidad ?? '').slice(0, 300),
        },
      },
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    console.error('[llamadas-ia] Vapi error:', res.status, detalle)
    return json({ error: `Vapi rechazó la llamada (${res.status}). Revisa saldo/permisos.` }, 502)
  }

  const call = await res.json<{ id?: string }>()
  if (!call.id) return json({ error: 'Vapi no devolvió id de llamada' }, 502)

  await ctx.env.DB
    .prepare('INSERT INTO llamadas_ia (lead_id, call_id, telefono) VALUES (?, ?, ?)')
    .bind(lead.id, call.id, numero)
    .run()

  return json({ ok: true, call_id: call.id, telefono: numero })
}
