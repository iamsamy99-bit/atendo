/// <reference types="@cloudflare/workers-types" />
// CRUD genérico sobre D1 con lista blanca de columnas por tabla.
import { json } from './auth'

export interface TableSpec {
  table: string
  /** Columnas editables por el cliente (nunca id/created_at). */
  fields: string[]
  /** Columnas obligatorias al crear. */
  required: string[]
  orderBy: string
}

export const SPECS: Record<string, TableSpec> = {
  leads: {
    table: 'leads',
    fields: ['canal', 'origen', 'nombre', 'telefono', 'email', 'empresa', 'industria', 'necesidad',
      'volumen_estimado', 'plan_interes', 'idioma', 'siguiente_accion', 'estado', 'motivo_perdida', 'notas', 'cliente_id'],
    required: ['nombre'],
    orderBy: 'created_at DESC',
  },
  clientes: {
    table: 'clientes',
    fields: ['nombre', 'negocio', 'industria', 'email', 'telefono', 'plan', 'mensualidad', 'estado', 'fecha_inicio', 'notas'],
    required: ['nombre'],
    orderBy: 'created_at DESC',
  },
  pagos: {
    table: 'pagos',
    fields: ['cliente_id', 'monto', 'moneda', 'fecha', 'metodo', 'concepto', 'notas'],
    required: ['cliente_id', 'monto', 'fecha'],
    orderBy: 'fecha DESC',
  },
  tickets: {
    table: 'tickets',
    fields: ['cliente_id', 'titulo', 'descripcion', 'estado', 'prioridad', 'resuelto_at', 'notas'],
    required: ['titulo'],
    orderBy: "CASE estado WHEN 'abierto' THEN 0 WHEN 'en_curso' THEN 1 ELSE 2 END, created_at DESC",
  },
}

function pick(body: Record<string, unknown>, spec: TableSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of spec.fields) {
    if (f in body) {
      const v = body[f]
      out[f] = v === '' || v === undefined ? null : v
    }
  }
  return out
}

export async function listRows(db: D1Database, spec: TableSpec): Promise<Response> {
  const { results } = await db.prepare(`SELECT * FROM ${spec.table} ORDER BY ${spec.orderBy} LIMIT 1000`).all()
  return json(results)
}

export async function createRow(db: D1Database, spec: TableSpec, req: Request): Promise<Response> {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }

  const data = pick(body, spec)
  for (const r of spec.required) {
    if (data[r] === null || data[r] === undefined) return json({ error: `Falta el campo: ${r}` }, 400)
  }
  const cols = Object.keys(data)
  const placeholders = cols.map(() => '?').join(', ')
  try {
    const res = await db
      .prepare(`INSERT INTO ${spec.table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`)
      .bind(...cols.map(c => data[c]))
      .first()
    return json(res, 201)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error al crear' }, 400)
  }
}

export async function updateRow(db: D1Database, spec: TableSpec, req: Request, id: string): Promise<Response> {
  if (!/^\d+$/.test(id)) return json({ error: 'ID inválido' }, 400)
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }

  const data = pick(body, spec)
  if (Object.keys(data).length === 0) return json({ error: 'Nada que actualizar' }, 400)
  if (spec.table === 'leads') data.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const sets = Object.keys(data).map(c => `${c} = ?`).join(', ')
  try {
    const res = await db
      .prepare(`UPDATE ${spec.table} SET ${sets} WHERE id = ? RETURNING *`)
      .bind(...Object.values(data), Number(id))
      .first()
    if (!res) return json({ error: 'No encontrado' }, 404)
    return json(res)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error al actualizar' }, 400)
  }
}

export async function deleteRow(db: D1Database, spec: TableSpec, id: string): Promise<Response> {
  if (!/^\d+$/.test(id)) return json({ error: 'ID inválido' }, 400)
  await db.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(Number(id)).run()
  return json({ ok: true })
}
