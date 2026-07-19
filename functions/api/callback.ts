import { json, type Env } from '../_lib/auth'
import { normalizarTelefono } from './llamadas-ia'

// Callback público desde la landing: el visitante deja nombre + teléfono y
// Sofía (assistant "Callback Web" de Vapi) le marca al instante, 24/7.
// Ruta pública (ver _middleware); la autoridad anti-abuso es este endpoint:
//   - honeypot `web` (los bots lo llenan; se responde ok falso)
//   - máx 2 llamadas por IP cada 24 h, tope global 30/24 h
//   - máx 1 llamada por teléfono cada 24 h (evita acoso a terceros)
// El resultado de la llamada llega por /api/vapi-webhook (tabla llamadas_ia).

const SALUDOS = {
  es: (nombre: string) =>
    `¡Hola${nombre ? ` ${nombre}` : ''}! Soy Sofía, de Atendo. Me pediste hace un momento en nuestra página que te llamara. ¿Cómo estás?`,
  en: (nombre: string) =>
    `Hi${nombre ? ` ${nombre}` : ''}! This is Sofía from Atendo — you just requested a call on our website. How are you?`,
}

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const { DB, VAPI_PRIVATE_KEY, VAPI_CALLBACK_ASSISTANT_ID, VAPI_OUTBOUND_PHONE_ID } = ctx.env
  if (!VAPI_PRIVATE_KEY || !VAPI_CALLBACK_ASSISTANT_ID || !VAPI_OUTBOUND_PHONE_ID) {
    return json({ error: 'Servicio no configurado' }, 500)
  }

  let body: { nombre?: unknown; telefono?: unknown; idioma?: unknown; web?: unknown } = {}
  try { body = await ctx.request.json() } catch { return json({ error: 'Cuerpo inválido' }, 400) }

  const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'desconocida'
  const telefonoRaw = String(body.telefono ?? '').slice(0, 30)

  // Honeypot: los humanos no ven este campo. Responder ok falso, sin llamar.
  if (typeof body.web === 'string' && body.web.trim() !== '') {
    await DB.prepare("INSERT INTO callback_solicitudes (ip, telefono, estado, detalle) VALUES (?, ?, 'rechazada', 'honeypot')")
      .bind(ip, telefonoRaw).run()
    return json({ ok: true })
  }

  const nombre = String(body.nombre ?? '').trim().slice(0, 80)
  const numero = normalizarTelefono(telefonoRaw)
  if (!nombre || !numero) return json({ error: 'Nombre o teléfono no válidos' }, 400)
  const idioma = body.idioma === 'en' ? 'en' : 'es'

  // Límites (las filas 'rechazada' no cuentan: solo llamadas reales).
  const porIp = await DB.prepare(
    "SELECT COUNT(*) AS n FROM callback_solicitudes WHERE ip = ? AND estado = 'llamada' AND created_at > datetime('now', '-1 day')"
  ).bind(ip).first<{ n: number }>()
  if ((porIp?.n ?? 0) >= 2) return json({ error: 'limite' }, 429)

  const global = await DB.prepare(
    "SELECT COUNT(*) AS n FROM callback_solicitudes WHERE estado = 'llamada' AND created_at > datetime('now', '-1 day')"
  ).first<{ n: number }>()
  if ((global?.n ?? 0) >= 30) return json({ error: 'limite' }, 429)

  const mismoTel = await DB.prepare(
    "SELECT id FROM callback_solicitudes WHERE telefono = ? AND estado = 'llamada' AND created_at > datetime('now', '-1 day')"
  ).bind(numero).first()
  if (mismoTel) return json({ ok: true, repetido: true })

  // Lead: reusar si ya existe uno con ese teléfono (últimos 10 dígitos).
  const fecha = new Date().toISOString().slice(0, 10)
  const existente = await DB.prepare("SELECT id FROM leads WHERE telefono LIKE '%' || ? LIMIT 1")
    .bind(numero.slice(-10)).first<{ id: number }>()
  let leadId: number
  if (existente) {
    leadId = existente.id
    await DB.prepare(
      `UPDATE leads SET notas = CASE WHEN notas IS NULL OR notas = '' THEN ? ELSE notas || char(10) || ? END,
        updated_at = datetime('now') WHERE id = ?`
    ).bind(`[${fecha}] Pidió callback desde la web`, `[${fecha}] Pidió callback desde la web`, leadId).run()
  } else {
    const r = await DB.prepare(
      `INSERT INTO leads (canal, origen, nombre, telefono, idioma, estado, siguiente_accion)
       VALUES ('otro', 'callback-web', ?, ?, ?, 'nuevo', 'Callback IA en curso')`
    ).bind(nombre, numero, idioma).run()
    leadId = Number(r.meta.last_row_id)
  }

  const res = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: { authorization: `Bearer ${VAPI_PRIVATE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      assistantId: VAPI_CALLBACK_ASSISTANT_ID,
      phoneNumberId: VAPI_OUTBOUND_PHONE_ID,
      customer: { number: numero, name: nombre },
      assistantOverrides: {
        variableValues: {
          nombreContacto: nombre,
          saludoInicial: SALUDOS[idioma](nombre.split(/\s+/)[0] ?? ''),
          idioma,
          contexto: 'Pidió callback desde atendo.lat hace unos segundos; sigue frente a la página.',
        },
      },
    }),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    console.error('[callback] Vapi error:', res.status, detalle)
    await DB.prepare("INSERT INTO callback_solicitudes (ip, telefono, lead_id, estado, detalle) VALUES (?, ?, ?, 'rechazada', ?)")
      .bind(ip, numero, leadId, `vapi ${res.status}`).run()
    return json({ error: 'No pudimos iniciar la llamada. Escríbenos por WhatsApp.' }, 502)
  }

  const call = await res.json<{ id?: string }>()
  if (call.id) {
    await DB.prepare('INSERT INTO llamadas_ia (lead_id, call_id, telefono) VALUES (?, ?, ?)')
      .bind(leadId, call.id, numero).run()
  }
  await DB.prepare("INSERT INTO callback_solicitudes (ip, telefono, lead_id, estado, detalle) VALUES (?, ?, ?, 'llamada', ?)")
    .bind(ip, numero, leadId, call.id ?? null).run()

  return json({ ok: true })
}
