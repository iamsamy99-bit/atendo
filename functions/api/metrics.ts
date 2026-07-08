import { json, type Env } from '../_lib/auth'

// Métricas del inicio: clientes activos, ingresos del mes, leads nuevos,
// tickets abiertos y pipeline por estado.
export const onRequestGet: PagesFunction<Env> = async ctx => {
  const db = ctx.env.DB
  const [clientes, pagosMes, leadsNuevos, ticketsAbiertos, pipeline, pagosPorMes] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM clientes WHERE estado = 'activo'").first<{ n: number }>(),
    db.prepare("SELECT COALESCE(SUM(monto),0) AS total FROM pagos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m','now')").first<{ total: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM leads WHERE estado NOT IN ('ganado','perdido')").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE estado != 'resuelto'").first<{ n: number }>(),
    db.prepare('SELECT estado, COUNT(*) AS n FROM leads GROUP BY estado').all(),
    db.prepare("SELECT strftime('%Y-%m', fecha) AS mes, SUM(monto) AS total FROM pagos GROUP BY mes ORDER BY mes DESC LIMIT 6").all(),
  ])

  return json({
    clientes_activos: clientes?.n ?? 0,
    ingresos_mes: pagosMes?.total ?? 0,
    leads_abiertos: leadsNuevos?.n ?? 0,
    tickets_abiertos: ticketsAbiertos?.n ?? 0,
    pipeline: pipeline.results,
    pagos_por_mes: pagosPorMes.results,
  })
}
