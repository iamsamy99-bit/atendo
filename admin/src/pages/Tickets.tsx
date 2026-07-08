import { useEffect, useState, useCallback, useMemo } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Badge, Empty } from '../components/ui'
import { fmtFecha, type Ticket, type Cliente } from '../types'

const ESTADOS = [
  { key: 'abierto', label: 'Abierto', tone: 'red' as const },
  { key: 'en_curso', label: 'En curso', tone: 'amber' as const },
  { key: 'resuelto', label: 'Resuelto', tone: 'green' as const },
]
const PRIORIDADES = [
  { key: 'alta', label: 'Alta', tone: 'red' as const },
  { key: 'media', label: 'Media', tone: 'amber' as const },
  { key: 'baja', label: 'Baja', tone: 'gray' as const },
]

export default function Tickets() {
  const [rows, setRows] = useState<Ticket[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Ticket> | null>(null)
  const [busy, setBusy] = useState(false)
  const [verResueltos, setVerResueltos] = useState(false)

  const load = useCallback(() => {
    Promise.all([api.get<Ticket[]>('/tickets'), api.get<Cliente[]>('/clientes')])
      .then(([t, c]) => { setRows(t); setClientes(c) })
      .catch(() => setError('No se pudieron cargar los tickets.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const nombreCliente = useMemo(() => {
    const m = new Map(clientes.map(c => [c.id, c.nombre]))
    return (id: number | null) => (id ? m.get(id) ?? `#${id}` : 'General')
  }, [clientes])

  const save = async () => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      const payload = { ...editing }
      if (payload.estado === 'resuelto' && !payload.resuelto_at) {
        payload.resuelto_at = new Date().toISOString().replace('T', ' ').slice(0, 19)
      }
      if (payload.estado !== 'resuelto') payload.resuelto_at = null
      if (editing.id) {
        const u = await api.put<Ticket>(`/tickets/${editing.id}`, payload)
        setRows(prev => prev.map(r => (r.id === u.id ? u : r)))
      } else {
        const c = await api.post<Ticket>('/tickets', payload)
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
    if (!confirm('¿Eliminar este ticket?')) return
    setBusy(true)
    try {
      await api.delete(`/tickets/${editing.id}`)
      setRows(prev => prev.filter(r => r.id !== editing.id))
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  const set = (k: keyof Ticket, v: unknown) => setEditing(p => ({ ...p, [k]: v }))
  const visibles = verResueltos ? rows : rows.filter(r => r.estado !== 'resuelto')
  const abiertos = rows.filter(r => r.estado !== 'resuelto').length

  if (loading) return <div className="loading">Cargando…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tickets</h1>
          <p className="sub">{abiertos} sin resolver</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => setVerResueltos(v => !v)}>
            {verResueltos ? 'Ocultar resueltos' : 'Ver resueltos'}
          </button>
          <button className="btn" onClick={() => setEditing({ estado: 'abierto', prioridad: 'media' })}>+ Nuevo ticket</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {visibles.length === 0 ? (
        <Empty icon="◉" text={rows.length === 0 ? 'Sin tickets. Todo tranquilo.' : 'Nada pendiente — todos los tickets están resueltos.'} />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Ticket</th><th>Cliente</th><th>Prioridad</th><th>Estado</th><th>Creado</th></tr>
            </thead>
            <tbody>
              {visibles.map(t => {
                const est = ESTADOS.find(e => e.key === t.estado)!
                const pri = PRIORIDADES.find(p => p.key === t.prioridad)!
                return (
                  <tr key={t.id} className="row-click" onClick={() => setEditing(t)}>
                    <td>
                      <div className="strong">{t.titulo}</div>
                      {t.descripcion && <div className="dim">{t.descripcion.slice(0, 80)}{t.descripcion.length > 80 ? '…' : ''}</div>}
                    </td>
                    <td>{nombreCliente(t.cliente_id)}</td>
                    <td><Badge tone={pri.tone}>{pri.label}</Badge></td>
                    <td><Badge tone={est.tone}>{est.label}</Badge></td>
                    <td className="dim">{fmtFecha(t.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Ticket #${editing.id}` : 'Nuevo ticket'}
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
                <Field label="Título *">
                  <input value={editing.titulo ?? ''} onChange={e => set('titulo', e.target.value)} required />
                </Field>
              </div>
              <div className="full">
                <Field label="Descripción">
                  <textarea value={editing.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
                </Field>
              </div>
              <Field label="Cliente">
                <select value={editing.cliente_id ?? ''} onChange={e => set('cliente_id', Number(e.target.value) || null)}>
                  <option value="">General (sin cliente)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Prioridad">
                <select value={editing.prioridad ?? 'media'} onChange={e => set('prioridad', e.target.value)}>
                  {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select value={editing.estado ?? 'abierto'} onChange={e => set('estado', e.target.value)}>
                  {ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <div className="full">
                <Field label="Notas de resolución">
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
