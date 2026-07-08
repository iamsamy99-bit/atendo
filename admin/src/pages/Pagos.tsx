import { useEffect, useState, useCallback, useMemo } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Empty } from '../components/ui'
import { fmtMXN, fmtFecha, hoyISO, type Pago, type Cliente } from '../types'

const METODOS = [
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'tarjeta', label: 'Tarjeta' },
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'otro', label: 'Otro' },
]

export default function Pagos() {
  const [rows, setRows] = useState<Pago[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Pago> | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([api.get<Pago[]>('/pagos'), api.get<Cliente[]>('/clientes')])
      .then(([p, c]) => { setRows(p); setClientes(c) })
      .catch(() => setError('No se pudieron cargar los pagos.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const nombreCliente = useMemo(() => {
    const m = new Map(clientes.map(c => [c.id, c.nombre]))
    return (id: number) => m.get(id) ?? `#${id}`
  }, [clientes])

  const save = async () => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      if (editing.id) {
        const u = await api.put<Pago>(`/pagos/${editing.id}`, editing)
        setRows(prev => prev.map(r => (r.id === u.id ? u : r)))
      } else {
        const c = await api.post<Pago>('/pagos', editing)
        setRows(prev => [c, ...prev])
      }
      setEditing(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editing?.id || busy) return
    if (!confirm('¿Eliminar este pago?')) return
    setBusy(true)
    try {
      await api.delete(`/pagos/${editing.id}`)
      setRows(prev => prev.filter(r => r.id !== editing.id))
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  const set = (k: keyof Pago, v: unknown) => setEditing(p => ({ ...p, [k]: v }))

  const mesActual = hoyISO().slice(0, 7)
  const totalMes = rows.filter(r => r.fecha?.startsWith(mesActual)).reduce((s, r) => s + r.monto, 0)
  const totalHistorico = rows.reduce((s, r) => s + r.monto, 0)

  if (loading) return <div className="loading">Cargando…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pagos</h1>
          <p className="sub">Este mes: <strong>{fmtMXN(totalMes)}</strong> · histórico: {fmtMXN(totalHistorico)}</p>
        </div>
        <button className="btn" onClick={() => setEditing({ fecha: hoyISO(), metodo: 'transferencia', moneda: 'MXN' })}
          disabled={clientes.length === 0}
          title={clientes.length === 0 ? 'Primero registra un cliente' : ''}>
          + Registrar pago
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {rows.length === 0 ? (
        <Empty icon="$" text={clientes.length === 0
          ? 'Registra primero un cliente en la sección Clientes; después podrás capturar sus pagos.'
          : 'Sin pagos registrados todavía.'} />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Método</th><th style={{ textAlign: 'right' }}>Monto</th></tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="row-click" onClick={() => setEditing(p)}>
                  <td className="dim">{fmtFecha(p.fecha)}</td>
                  <td className="strong">{nombreCliente(p.cliente_id)}</td>
                  <td>{p.concepto ?? '—'}</td>
                  <td className="dim">{METODOS.find(m => m.key === p.metodo)?.label ?? p.metodo}</td>
                  <td className="strong" style={{ textAlign: 'right' }}>{fmtMXN(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Editar pago' : 'Registrar pago'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.id && <button className="btn-danger" onClick={remove}>Eliminar</button>}
              <div className="right">
                <button className="btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </>
          }
        >
          {error && <div className="error-box">{error}</div>}
          <Form onSubmit={save}>
            <div className="form-grid">
              <div className="full">
                <Field label="Cliente *">
                  <select value={editing.cliente_id ?? ''} onChange={e => set('cliente_id', Number(e.target.value) || null)} required>
                    <option value="">Seleccionar…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.negocio ? ` — ${c.negocio}` : ''}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Monto (MXN) *">
                <input type="number" min="0" step="0.01" value={editing.monto ?? ''}
                  onChange={e => set('monto', parseFloat(e.target.value) || 0)} required />
              </Field>
              <Field label="Fecha *">
                <input type="date" value={editing.fecha ?? ''} onChange={e => set('fecha', e.target.value)} required />
              </Field>
              <Field label="Método">
                <select value={editing.metodo ?? 'transferencia'} onChange={e => set('metodo', e.target.value)}>
                  {METODOS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Concepto">
                <input value={editing.concepto ?? ''} onChange={e => set('concepto', e.target.value)} placeholder="Ej. Mensualidad julio" />
              </Field>
              <div className="full">
                <Field label="Notas">
                  <textarea value={editing.notas ?? ''} onChange={e => set('notas', e.target.value)} />
                </Field>
              </div>
            </div>
            <button type="submit" hidden />
          </Form>
        </Modal>
      )}
    </>
  )
}
