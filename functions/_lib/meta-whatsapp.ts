/// <reference types="@cloudflare/workers-types" />
import { json } from './auth'

const META_API_VERSION = 'v23.0'

export interface WhatsAppIncomingMessage {
  from: string
  profileName?: string
  messageId?: string
  text: string
  timestamp?: string
}

interface MetaWebhookPayload {
  object?: string
  entry?: Array<{
    changes?: Array<{
      value?: {
        messaging_product?: string
        metadata?: { phone_number_id?: string }
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
        messages?: Array<{
          id?: string
          from?: string
          timestamp?: string
          type?: string
          text?: { body?: string }
          interactive?: {
            button_reply?: { title?: string }
            list_reply?: { title?: string; description?: string }
          }
        }>
        statuses?: Array<{
          id?: string
          status?: string
          timestamp?: string
        }>
      }
    }>
  }>
}

/**
 * Valida la firma HMAC-SHA256 que Meta manda en `X-Hub-Signature-256` sobre el
 * cuerpo crudo del webhook. Sin esto cualquiera que conozca la URL puede forjar
 * un payload: como el `from` del mensaje se usa como destino del envío, un
 * tercero podría hacer que el número del negocio mande mensajes arbitrarios.
 *
 * Devuelve false si falta el secreto o la firma: preferimos rechazar el
 * webhook antes que procesar un payload que no podemos atribuir a Meta.
 */
export async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null
): Promise<boolean> {
  if (!appSecret || !signatureHeader) return false
  const expectedPrefix = 'sha256='
  if (!signatureHeader.startsWith(expectedPrefix)) return false
  const received = signatureHeader.slice(expectedPrefix.length).trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(received)) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')

  // Comparación de tiempo constante: un `===` filtra cuántos caracteres
  // coinciden y permitiría forjar la firma byte por byte.
  if (expected.length !== received.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i)
  return diff === 0
}

export function verifyWebhook(req: Request, verifyToken: string | null): Response | null {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode !== 'subscribe') return json({ error: 'Modo no soportado' }, 400)
  if (!verifyToken || token !== verifyToken) return json({ error: 'Token invalido' }, 403)
  return new Response(challenge ?? '', { status: 200 })
}

export async function parseIncomingMessages(req: Request): Promise<{
  raw: string
  payload: MetaWebhookPayload
  messages: WhatsAppIncomingMessage[]
  statuses: Array<{ id: string; status: string; timestamp?: string }>
}> {
  const raw = await req.text()
  let payload: MetaWebhookPayload = {}
  try { payload = JSON.parse(raw) as MetaWebhookPayload } catch { /* ignore */ }

  const messages: WhatsAppIncomingMessage[] = []
  const statuses: Array<{ id: string; status: string; timestamp?: string }> = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      const contact = value?.contacts?.[0]
      for (const msg of value?.messages ?? []) {
        const text = msg.text?.body?.trim()
          || msg.interactive?.button_reply?.title?.trim()
          || msg.interactive?.list_reply?.title?.trim()
          || ''
        if (!msg.from || !text) continue
        messages.push({
          from: msg.from,
          profileName: contact?.profile?.name,
          messageId: msg.id,
          text,
          timestamp: msg.timestamp,
        })
      }
      for (const status of value?.statuses ?? []) {
        if (!status.id || !status.status) continue
        statuses.push({ id: status.id, status: status.status, timestamp: status.timestamp })
      }
    }
  }

  return { raw, payload, messages, statuses }
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    })
    const data = await res.json().catch(() => ({})) as {
      messages?: Array<{ id?: string }>
      error?: { message?: string }
    }
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }
    return { ok: true, id: data.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red' }
  }
}
