import { SPECS, listRows, createRow } from '../../_lib/crud'
import type { Env } from '../../_lib/auth'

export const onRequestGet: PagesFunction<Env> = ctx => listRows(ctx.env.DB, SPECS.tickets)
export const onRequestPost: PagesFunction<Env> = ctx => createRow(ctx.env.DB, SPECS.tickets, ctx.request)
