import { useEffect, useState } from 'react'
import { api } from '../api'
import { fmtMXN, LEAD_ESTADOS, type Metrics } from '../types'

export default function Inicio() {
  const [m, setM] = useState<Metrics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Metrics>('/metrics').then(setM).catch(() => setError('No se pudieron cargar las métricas.'))
  }, [])

  if (error) return <div className="error-box">{error}</div>
  if (!m) return <div className="loading">Cargando…</div>

  const pipelineMap = new Map(m.pipeline.map(p => [p.estado, p.n]))
  const maxMes = Math.max(1, ...m.pagos_por_mes.map(p => p.total))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inicio</h1>
          <p className="sub">Resumen del negocio en tiempo real</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat accent">
          <div className="label">Ingresos del mes</div>
          <div className="value">{fmtMXN(m.ingresos_mes)}</div>
        </div>
        <div className="stat">
          <div className="label">Clientes activos</div>
          <div className="value">{m.clientes_activos}</div>
        </div>
        <div className="stat">
          <div className="label">Leads en pipeline</div>
          <div className="value">{m.leads_abiertos}</div>
        </div>
        <div className="stat">
          <div className="label">Tickets abiertos</div>
          <div className="value">{m.tickets_abiertos}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Pipeline de leads</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{LEAD_ESTADOS.map(e => <th key={e.key}>{e.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                {LEAD_ESTADOS.map(e => (
                  <td key={e.key} style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600 }}>
                    {pipelineMap.get(e.key) ?? 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {m.pagos_por_mes.length > 0 && (
        <div className="card">
          <div className="card-head">Ingresos por mes</div>
          <div style={{ padding: '18px 20px', display: 'grid', gap: 10 }}>
            {[...m.pagos_por_mes].reverse().map(p => (
              <div key={p.mes} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 110px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}>{p.mes}</span>
                <div style={{ background: 'var(--bg-alt)', borderRadius: 6, height: 22, overflow: 'hidden' }}>
                  <div style={{ width: `${(p.total / maxMes) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 6, minWidth: 4 }} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{fmtMXN(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
