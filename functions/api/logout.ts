import { json, destroySession, type Env } from '../_lib/auth'

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const cookie = await destroySession(ctx.request, ctx.env.DB)
  return json({ ok: true }, 200, { 'set-cookie': cookie })
}
