import { json, type Env } from '../_lib/auth'

// El middleware ya validó la sesión; si llegamos aquí, está autenticado.
export const onRequestGet: PagesFunction<Env> = async () => json({ ok: true })
