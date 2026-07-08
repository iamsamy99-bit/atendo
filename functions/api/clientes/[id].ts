import { SPECS, updateRow, deleteRow } from '../../_lib/crud'
import type { Env } from '../../_lib/auth'

export const onRequestPut: PagesFunction<Env> = ctx => updateRow(ctx.env.DB, SPECS.clientes, ctx.request, String(ctx.params.id))
export const onRequestDelete: PagesFunction<Env> = ctx => deleteRow(ctx.env.DB, SPECS.clientes, String(ctx.params.id))
