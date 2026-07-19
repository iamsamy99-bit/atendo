/// <reference types="@cloudflare/workers-types" />
// Marcador automático de campañas de Atendo (Sofía Ventas vía Vapi).
//
// Cada corrida del cron (cada 10 min en horario laboral de Hermosillo) toma
// hasta MAX_POR_CORRIDA leads pendientes de `campana_cola` y les marca con el
// assistant outbound. El resultado de cada llamada llega después por el
// webhook de Pages (/api/vapi-webhook), que actualiza `llamadas_ia` y el lead.
//
// Salvaguardas:
//   - Nunca marca a un lead ganado/perdido, sin teléfono válido, con
//     "NO VOLVER A LLAMAR" en siguiente_accion, o que en una llamada IA
//     previa pidió no ser contactado (resultado 'no_llamar').
//   - Si el lead tiene una llamada IA en curso, se deja pendiente para
//     la siguiente corrida.
//
// Forzar una corrida a mano (fuera de horario NO marca de más, solo procesa
// la cola): GET /run?key=<CRON_RUN_KEY>

interface Env {
  DB: D1Database
  VAPI_PRIVATE_KEY: string
  VAPI_OUTBOUND_ASSISTANT_ID: string
  VAPI_OUTBOUND_PHONE_ID: string
  CRON_RUN_KEY?: string
}

const MAX_POR_CORRIDA = 2

interface Pendiente {
  cola_id: number
  lead_id: number
  nombre: string
  telefono: string | null
  empresa: string | null
  industria: string | null
  necesidad: string | null
  estado: string
  siguiente_accion: string | null
}

// Copia de functions/api/llamadas-ia.ts (el worker no comparte bundle con
// las Pages Functions). Si cambia allá, cambiar aquí.
function normalizarTelefono(raw: string): string | null {
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

async function marcarOmitida(db: D1Database, colaId: number, detalle: string): Promise<void> {
  await db.prepare("UPDATE campana_cola SET estado = 'omitida', detalle = ? WHERE id = ?").bind(detalle, colaId).run()
}

async function ejecutar(env: Env): Promise<{ llamadas: number; omitidas: number; errores: number }> {
  const { results } = await env.DB.prepare(`
    SELECT c.id AS cola_id, l.id AS lead_id, l.nombre, l.telefono, l.empresa,
           l.industria, l.necesidad, l.estado, l.siguiente_accion
    FROM campana_cola c JOIN leads l ON l.id = c.lead_id
    WHERE c.estado = 'pendiente' ORDER BY c.created_at LIMIT ?
  `).bind(MAX_POR_CORRIDA).all<Pendiente>()

  let llamadas = 0, omitidas = 0, errores = 0
  for (const p of results) {
    if (p.estado === 'ganado' || p.estado === 'perdido') {
      await marcarOmitida(env.DB, p.cola_id, `Lead en estado ${p.estado}`); omitidas++; continue
    }
    if ((p.siguiente_accion ?? '').toUpperCase().includes('NO VOLVER A LLAMAR')) {
      await marcarOmitida(env.DB, p.cola_id, 'Pidió no ser llamado'); omitidas++; continue
    }
    const numero = p.telefono ? normalizarTelefono(p.telefono) : null
    if (!numero) {
      await marcarOmitida(env.DB, p.cola_id, `Teléfono no válido: ${p.telefono ?? 'vacío'}`); omitidas++; continue
    }
    const noLlamar = await env.DB.prepare(
      "SELECT id FROM llamadas_ia WHERE lead_id = ? AND resultado = 'no_llamar'"
    ).bind(p.lead_id).first()
    if (noLlamar) {
      await marcarOmitida(env.DB, p.cola_id, 'Pidió no ser llamado (llamada IA previa)'); omitidas++; continue
    }
    const enCurso = await env.DB.prepare(
      "SELECT id FROM llamadas_ia WHERE lead_id = ? AND estado = 'iniciada' AND created_at > datetime('now', '-10 minutes')"
    ).bind(p.lead_id).first()
    if (enCurso) continue // sigue pendiente; se reintenta en la próxima corrida

    try {
      const res = await fetch('https://api.vapi.ai/call', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.VAPI_PRIVATE_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          assistantId: env.VAPI_OUTBOUND_ASSISTANT_ID,
          phoneNumberId: env.VAPI_OUTBOUND_PHONE_ID,
          customer: { number: numero, name: p.empresa || p.nombre },
          assistantOverrides: {
            variableValues: {
              nombreNegocio: p.empresa || 'su negocio',
              nombreContacto: p.nombre.startsWith('Llamada ') ? '' : p.nombre,
              industria: p.industria ?? '',
              contexto: (p.necesidad ?? '').slice(0, 300),
            },
          },
        }),
      })
      if (!res.ok) {
        const detalle = await res.text().catch(() => '')
        await env.DB.prepare("UPDATE campana_cola SET estado = 'error', detalle = ? WHERE id = ?")
          .bind(`Vapi ${res.status}: ${detalle.slice(0, 200)}`, p.cola_id).run()
        errores++; continue
      }
      const call = await res.json<{ id?: string }>()
      if (call.id) {
        await env.DB.prepare('INSERT INTO llamadas_ia (lead_id, call_id, telefono) VALUES (?, ?, ?)')
          .bind(p.lead_id, call.id, numero).run()
      }
      await env.DB.prepare("UPDATE campana_cola SET estado = 'llamada_iniciada', detalle = ? WHERE id = ?")
        .bind(call.id ?? null, p.cola_id).run()
      llamadas++
    } catch (e) {
      await env.DB.prepare("UPDATE campana_cola SET estado = 'error', detalle = ? WHERE id = ?")
        .bind(e instanceof Error ? e.message : 'error de red', p.cola_id).run()
      errores++
    }
  }
  return { llamadas, omitidas, errores }
}

export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const r = await ejecutar(env)
    console.log(`[campanas] llamadas=${r.llamadas} omitidas=${r.omitidas} errores=${r.errores}`)
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/run') {
      if (!env.CRON_RUN_KEY || url.searchParams.get('key') !== env.CRON_RUN_KEY) {
        return new Response('no autorizado', { status: 401 })
      }
      const r = await ejecutar(env)
      return Response.json(r)
    }
    return new Response('atendo-campanas activo', { status: 200 })
  },
}
