import { json, verifyPassword, getConfig, createSession, type Env } from '../_lib/auth'

export const onRequestPost: PagesFunction<Env> = async ctx => {
  let body: { password?: string }
  try {
    body = await ctx.request.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }
  const password = String(body.password ?? '')
  if (!password || password.length > 200) return json({ error: 'Contraseña requerida' }, 400)

  const stored = await getConfig(ctx.env.DB, 'password_hash')
  if (!stored) return json({ error: 'Dashboard sin configurar' }, 500)

  const ok = await verifyPassword(password, stored)
  if (!ok) {
    // Freno básico contra fuerza bruta
    await new Promise(r => setTimeout(r, 400))
    return json({ error: 'Contraseña incorrecta' }, 401)
  }

  const { cookie } = await createSession(ctx.env.DB)
  return json({ ok: true }, 200, { 'set-cookie': cookie })
}
