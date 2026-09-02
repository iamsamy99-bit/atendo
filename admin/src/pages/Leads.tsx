import { useEffect, useState, useCallback, useMemo } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Empty } from '../components/ui'
import SeguimientoModal from '../components/SeguimientoModal'
import CampanaModal from '../components/CampanaModal'
import { LEAD_ESTADOS, LEAD_CANALES, LLAMADA_RESULTADOS, fmtFecha, hoyISO, type Lead, type Cliente, type LlamadaIA } from '../types'

const EMPTY: Partial<Lead> = { canal: 'telefono', idioma: 'es', estado: 'nuevo' }
const canalLabel = (c: string) => LEAD_CANALES.find(x => x.key === c)?.label ?? c

// Panel de llamadas salientes con IA (Sofía Ventas) dentro del modal del lead.
function LlamadasIA({ leadId, telefono }: { leadId: number; telefono: string | null }) {
  const [llamadas, setLlamadas] = useState<LlamadaIA[]>([])
  const [marcando, setMarcando] = useState(false)
  const [msg, setMsg] = useState('')

  const cargar = useCallback(() => {
    api.get<LlamadaIA[]>(`/llamadas-ia?lead_id=${leadId}`).then(setLlamadas).catch(() => {})
  }, [leadId])

  useEffect(cargar, [cargar])

  const llamar = async () => {
    if (marcando) return
    if (!confirm(`Sofía (IA) marcará al ${telefono} para ofrecer Atendo y agendar demo. ¿Iniciar la llamada?`)) return
    setMarcando(true); setMsg('')
    try {
      const r = await api.post<{ telefono: string }>('/llamadas-ia', { lead_id: leadId })
      setMsg(`📞 Llamando al ${r.telefono}… el resultado aparecerá aquí al colgar.`)
      cargar()
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'No se pudo iniciar la llamada')
    } finally {
      setMarcando(false)
    }
  }

  return (
    <div style={{ margin: '4px 0 16px', padding: 12, borderRadius: 10, background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>🤖 Llamadas con IA</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn-ghost" onClick={cargar} title="Actualizar">↻</button>
          <button type="button" className="btn" onClick={llamar} disabled={!telefono || marcando}>
            {marcando ? 'Marcando…' : '📞 Llamar con IA'}
          </button>
        </div>
      </div>
      {!telefono && <p className="sub" style={{ margin: '8px 0 0' }}>Agrega un teléfono al lead para poder llamarle.</p>}
      {msg && <p className="sub" style={{ margin: '8px 0 0' }}>{msg}</p>}
      {llamadas.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
          {llamadas.map(ll => (
            <li key={ll.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
              <span style={{ opacity: .75 }}>{fmtFecha(ll.created_at)}</span>{' · '}
              <strong>
                {ll.estado === 'iniciada' ? '⏳ En curso / sin reporte' : (LLAMADA_RESULTADOS[ll.resultado ?? ''] ?? ll.resultado ?? ll.estado)}
              </strong>
              {ll.resumen && <div style={{ opacity: .85 }}>{ll.resumen}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Lead> | null>(null)
  const [busy, setBusy] = useState(false)
  const [colapsadas, setColapsadas] = useState<Record<string, boolean>>({})
  const [seguimiento, setSeguimiento] = useState(false)
  const [campana, setCampana] = useState(false)
  const [origenFiltro, setOrigenFiltro] = useState<'inbound' | 'prospeccion' | 'todos'>('inbound')

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

  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      if (origenFiltro === 'inbound') return l.origen !== 'prospeccion'
      if (origenFiltro === 'prospeccion') return l.origen === 'prospeccion'
      return true
    })
  }, [leads, origenFiltro])

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={origenFiltro}
            onChange={e => setOrigenFiltro(e.target.value as any)}
            style={{
              background: 'var(--bg-alt)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: '0.85rem',
              color: 'var(--ink)'
            }}
          >
            <option value="inbound">Leads Inbound (Landing/Chat)</option>
            <option value="prospeccion">Prospectos Fríos</option>
            <option value="todos">Todos los Leads</option>
          </select>
          <button className="btn-ghost" onClick={() => setCampana(true)}>📣 Campaña IA</button>
          <button className="btn-ghost" onClick={() => setSeguimiento(true)}>✉ Enviar seguimiento</button>
          <button className="btn" onClick={() => setEditing({ ...EMPTY, origen: origenFiltro === 'prospeccion' ? 'prospeccion' : null })}>+ Nuevo lead</button>
        </div>
      </div>

      {seguimiento && <SeguimientoModal onClose={() => { setSeguimiento(false); load() }} />}
      {campana && <CampanaModal leads={leads} onClose={() => { setCampana(false); load() }} />}

      {error && <div className="error-box">{error}</div>}

      {leadsFiltrados.length === 0 ? (
        <Empty icon="➤" text="Aún no hay leads con este filtro." />
      ) : (
        <div className="kanban">
          {LEAD_ESTADOS.map(col => {
            const items = leadsFiltrados.filter(l => l.estado === col.key)
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
          {editing.id && <LlamadasIA leadId={editing.id} telefono={editing.telefono ?? null} />}
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
