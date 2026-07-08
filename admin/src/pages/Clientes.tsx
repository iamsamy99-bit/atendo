import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Badge, Empty } from '../components/ui'
import { fmtMXN, fmtFecha, hoyISO, type Cliente } from '../types'

const TONE: Record<Cliente['estado'], 'green' | 'amber' | 'red'> = { activo: 'green', pausado: 'amber', cancelado: 'red' }

export default function Clientes() {
  const [rows, setRows] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null)
  const [busy, setBusy] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | Cliente['estado']>('todos')

  const load = useCallback(() => {
    api.get<Cliente[]>('/clientes')
      .then(setRows)
      .catch(() => setError('No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const save = async () => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      if (editing.id) {
        const u = await api.put<Cliente>(`/clientes/${editing.id}`, editing)
        setRows(prev => prev.map(r => (r.id === u.id ? u : r)))
      } else {
        const c = await api.post<Cliente>('/clientes', editing)
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
    if (!confirm('¿Eliminar este cliente? Se eliminarán también sus pagos.')) return
    setBusy(true)
    try {
      await api.delete(`/clientes/${editing.id}`)
      setRows(prev => prev.filter(r => r.id !== editing.id))
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  const set = (k: keyof Cliente, v: unknown) => setEditing(p => ({ ...p, [k]: v }))
  const visibles = filtro === 'todos' ? rows : rows.filter(r => r.estado === filtro)
  const mrr = rows.filter(r => r.estado === 'activo').reduce((s, r) => s + (r.mensualidad || 0), 0)

  if (loading) return <div className="loading">Cargando…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clientes</h1>
          <p className="sub">{rows.filter(r => r.estado === 'activo').length} activos · ingreso mensual esperado {fmtMXN(mrr)}</p>
        </div>
        <button className="btn" onClick={() => setEditing({ estado: 'activo', fecha_inicio: hoyISO(), mensualidad: 0 })}>+ Nuevo cliente</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['todos', 'activo', 'pausado', 'cancelado'] as const).map(f => (
          <button key={f} className="btn-ghost" onClick={() => setFiltro(f)}
            style={filtro === f ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}}>
            {f === 'todos' ? 'Todos' : f[0].toUpperCase() + f.slice(1) + 's'}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Empty icon="●" text="Sin clientes en esta vista." />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Contacto</th><th>Plan</th><th>Mensualidad</th><th>Estado</th><th>Inicio</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(c => (
                <tr key={c.id} className="row-click" onClick={() => setEditing(c)}>
                  <td>
                    <div className="strong">{c.nombre}</div>
                    {c.negocio && <div className="dim">{c.negocio}{c.industria ? ` · ${c.industria}` : ''}</div>}
                  </td>
                  <td>
                    <div>{c.telefono ?? '—'}</div>
                    {c.email && <div className="dim">{c.email}</div>}
                  </td>
                  <td>{c.plan ?? '—'}</td>
                  <td className="strong">{c.mensualidad ? fmtMXN(c.mensualidad) : '—'}</td>
                  <td><Badge tone={TONE[c.estado]}>{c.estado}</Badge></td>
                  <td className="dim">{fmtFecha(c.fecha_inicio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Cliente: ${editing.nombre}` : 'Nuevo cliente'}
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
              <Field label="Nombre *">
                <input value={editing.nombre ?? ''} onChange={e => set('nombre', e.target.value)} required />
              </Field>
              <Field label="Negocio">
                <input value={editing.negocio ?? ''} onChange={e => set('negocio', e.target.value)} />
              </Field>
              <Field label="Industria">
                <input value={editing.industria ?? ''} onChange={e => set('industria', e.target.value)} />
              </Field>
              <Field label="Teléfono">
                <input value={editing.telefono ?? ''} onChange={e => set('telefono', e.target.value)} />
              </Field>
              <Field label="Email">
                <input type="email" value={editing.email ?? ''} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Plan contratado">
                <input value={editing.plan ?? ''} onChange={e => set('plan', e.target.value)} placeholder="Ej. Voz Pro" />
              </Field>
              <Field label="Mensualidad (MXN)">
                <input type="number" min="0" step="0.01" value={editing.mensualidad ?? 0}
                  onChange={e => set('mensualidad', parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Estado">
                <select value={editing.estado ?? 'activo'} onChange={e => set('estado', e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
              <Field label="Fecha de inicio">
                <input type="date" value={editing.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)} />
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
