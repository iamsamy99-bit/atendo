import { json, getSession, type Env } from '../_lib/auth'

// Rutas públicas: login (obvio), ingest-lead y vapi-webhook (cada una
// protegida por su propia clave en la tabla config); callback (formulario de
// la landing, protegido por honeypot + límites propios); whatsapp (webhook de
// Meta: el GET lleva el verify_token y el POST debe validar la firma
// X-Hub-Signature-256 — Meta no manda cookie de sesión).
const PUBLIC_PATHS = new Set(['/api/login', '/api/ingest-lead', '/api/vapi-webhook', '/api/callback', '/api/whatsapp'])

export const onRequest: PagesFunction<Env> = async ctx => {
  const url = new URL(ctx.request.url)
  if (PUBLIC_PATHS.has(url.pathname)) return ctx.next()

  const ok = await getSession(ctx.request, ctx.env.DB)
  if (!ok) return json({ error: 'No autenticado' }, 401)
  return ctx.next()
}
