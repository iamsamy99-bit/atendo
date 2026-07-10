import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Empty } from '../components/ui'
import SeguimientoModal from '../components/SeguimientoModal'
import { LEAD_ESTADOS, LEAD_CANALES, fmtFecha, hoyISO, type Lead, type Cliente } from '../types'

const EMPTY: Partial<Lead> = { canal: 'telefono', idioma: 'es', estado: 'nuevo' }
const canalLabel = (c: string) => LEAD_CANALES.find(x => x.key === c)?.label ?? c

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Lead> | null>(null)
  const [busy, setBusy] = useState(false)
  const [colapsadas, setColapsadas] = useState<Record<string, boolean>>({})
  const [seguimiento, setSeguimiento] = useState(false)

  const load = useCallback(() => {
    api.get<Lead[]>('/leads')
      .then(data => {
        setLeads(data)
        // En móvil la cascada arranca compacta: columnas vacías colapsadas.
        if (window.innerWidth < 820) {
          const c: Record<string, boolean> = {}
          for (const e of LEAD_ESTADOS) {
            if (!data.some(l => l.estado === e.key)) c[e.key] = true
          }
          setColapsadas(c)
        }
      })
      .catch(() => setError('No se pudieron cargar los leads.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const save = async () => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      if (editing.id) {
        const updated = await api.put<Lead>(`/leads/${editing.id}`, editing)
        setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
      } else {
        const created = await api.post<Lead>('/leads', editing)
        setLeads(prev => [created, ...prev])
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
    if (!confirm('¿Eliminar este lead? No se puede deshacer.')) return
    setBusy(true)
    try {
      await api.delete(`/leads/${editing.id}`)
      setLeads(prev => prev.filter(l => l.id !== editing.id))
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  // Ganado → ofrecer convertir a cliente
  const convertir = async (lead: Lead) => {
    if (!confirm(`¿Crear cliente a partir de "${lead.nombre}"?`)) return
    const cliente = await api.post<Cliente>('/clientes', {
      nombre: lead.nombre,
      negocio: lead.empresa,
      industria: lead.industria,
      email: lead.email,
      telefono: lead.telefono,
      plan: lead.plan_interes,
      estado: 'activo',
      fecha_inicio: hoyISO(),
      notas: lead.necesidad ? `Necesidad: ${lead.necesidad}` : null,
    })
    const updated = await api.put<Lead>(`/leads/${lead.id}`, { estado: 'ganado', cliente_id: cliente.id })
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    alert('Cliente creado. Lo encuentras en la sección Clientes.')
  }

  const set = (k: keyof Lead, v: unknown) => setEditing(p => ({ ...p, [k]: v }))

  if (loading) return <div className="loading">Cargando…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p className="sub">Pipeline de ventas — toca un lead para ver y editar sus detalles</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setSeguimiento(true)}>✉ Enviar seguimiento</button>
          <button className="btn" onClick={() => setEditing({ ...EMPTY })}>+ Nuevo lead</button>
        </div>
      </div>

      {seguimiento && <SeguimientoModal onClose={() => { setSeguimiento(false); load() }} />}

      {error && <div className="error-box">{error}</div>}

      {leads.length === 0 ? (
        <Empty icon="➤" text="Aún no hay leads. Crea el primero o conecta tus automatizaciones de Make." />
      ) : (
        <div className="kanban">
          {LEAD_ESTADOS.map(col => {
            const items = leads.filter(l => l.estado === col.key)
            const cerrada = !!colapsadas[col.key]
            return (
              <div className={`kcol ${cerrada ? 'closed' : ''}`} key={col.key}>
                <button
                  className="kcol-head"
                  onClick={() => setColapsadas(p => ({ ...p, [col.key]: !p[col.key] }))}
                  aria-expanded={!cerrada}
                >
                  <span>{col.label}</span>
                  <span className="count">{items.length}</span>
                  <span className={`chev ${cerrada ? '' : 'open'}`} aria-hidden="true">▾</span>
                </button>
                {!cerrada && items.length === 0 && (
                  <p className="krow-empty">Sin leads aquí</p>
                )}
                {!cerrada && items.map((l, idx) => (
                  <button className="krow" key={l.id} style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }} onClick={() => setEditing(l)}>
                    <span className="krow-main">
                      <span className="krow-name">{l.nombre}</span>
                      <span className="krow-meta">
                        {canalLabel(l.canal)}{l.empresa ? ` · ${l.empresa}` : ''}
                        {l.siguiente_accion ? ` · → ${l.siguiente_accion}` : ''}
                      </span>
                    </span>
                    <span className="krow-chev" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Lead: ${editing.nombre}` : 'Nuevo lead'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.id && <button className="btn-danger" onClick={remove}>Eliminar</button>}
              <div className="right">
                {editing.id && editing.estado === 'ganado' && !editing.cliente_id && (
                  <button className="btn-ghost" onClick={() => convertir(editing as Lead)}>→ Cliente</button>
                )}
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
              <Field label="Canal">
                <select value={editing.canal ?? 'otro'} onChange={e => set('canal', e.target.value)}>
                  {LEAD_CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Teléfono">
                <input value={editing.telefono ?? ''} onChange={e => set('telefono', e.target.value)} />
              </Field>
              <Field label="Email">
                <input type="email" value={editing.email ?? ''} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Empresa / negocio">
                <input value={editing.empresa ?? ''} onChange={e => set('empresa', e.target.value)} />
              </Field>
              <Field label="Industria">
                <input value={editing.industria ?? ''} onChange={e => set('industria', e.target.value)} />
              </Field>
              <Field label="Plan de interés">
                <input value={editing.plan_interes ?? ''} onChange={e => set('plan_interes', e.target.value)} />
              </Field>
              <Field label="Volumen estimado">
                <input value={editing.volumen_estimado ?? ''} onChange={e => set('volumen_estimado', e.target.value)} placeholder="Ej. 200 llamadas/mes" />
              </Field>
              <div className="full">
                <Field label="Necesidad principal">
                  <input value={editing.necesidad ?? ''} onChange={e => set('necesidad', e.target.value)} placeholder="Llamadas, WhatsApp, sitio web…" />
                </Field>
              </div>
              <Field label="Estado">
                <select value={editing.estado ?? 'nuevo'} onChange={e => set('estado', e.target.value)}>
                  {LEAD_ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Siguiente acción">
                <input value={editing.siguiente_accion ?? ''} onChange={e => set('siguiente_accion', e.target.value)} placeholder="Ej. llamar mañana 10am" />
              </Field>
              {editing.estado === 'perdido' && (
                <div className="full">
                  <Field label="Motivo de pérdida">
                    <input value={editing.motivo_perdida ?? ''} onChange={e => set('motivo_perdida', e.target.value)} />
                  </Field>
                </div>
              )}
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
