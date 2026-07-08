import { json, getConfig, type Env } from '../_lib/auth'
import { SPECS, createRow } from '../_lib/crud'

// Ingesta de leads desde automatizaciones (Make, Vapi, formularios).
// Protegida por la clave 'ingest_key' de la tabla config, enviada en el
// header X-Atendo-Key. Así las automatizaciones escriben directo al CRM
// sin sesión de dashboard.
export const onRequestPost: PagesFunction<Env> = async ctx => {
  const key = ctx.request.headers.get('x-atendo-key') ?? ''
  const expected = await getConfig(ctx.env.DB, 'ingest_key')
  if (!expected || key !== expected) return json({ error: 'Clave inválida' }, 401)
  return createRow(ctx.env.DB, SPECS.leads, ctx.request)
}
