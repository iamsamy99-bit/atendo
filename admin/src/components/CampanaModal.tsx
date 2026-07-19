import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api'
import { Modal } from './ui'
import { LEAD_ESTADOS, type Lead } from '../types'

// Campañas de llamadas con IA: selecciona leads y los manda a la cola del
// marcador automático (worker-campanas: lun-vie 9:00-16:50 Hermosillo,
// máx 2 llamadas cada 10 minutos).

interface ColaItem {
  id: number
  lead_id: number
  nombre: string
  empresa: string | null
  telefono: string | null
}

interface ColaResp {
  pendientes: ColaItem[]
  iniciadas_hoy: number
}

export default function CampanaModal({ leads, onClose }: { leads: Lead[]; onClose: () => void }) {
  const [cola, setCola] = useState<ColaResp | null>(null)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [filtro, setFiltro] = useState('todos')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const cargarCola = useCallback(() => {
    api.get<ColaResp>('/campanas').then(setCola).catch(() => setMsg('No se pudo cargar la cola.'))
  }, [])

  useEffect(cargarCola, [cargarCola])

  const enCola = useMemo(() => new Set((cola?.pendientes ?? []).map(p => p.lead_id)), [cola])

  const elegibles = useMemo(() =>
    leads.filter(l =>
      l.telefono &&
      l.estado !== 'ganado' && l.estado !== 'perdido' &&
      !enCola.has(l.id) &&
      !(l.siguiente_accion ?? '').toUpperCase().includes('NO VOLVER A LLAMAR') &&
      (filtro === 'todos' || l.estado === filtro)
    ), [leads, enCola, filtro])

  const toggle = (id: number) => setSel(prev => {
    const s = new Set(prev)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })

  const marcarVisibles = (on: boolean) => setSel(prev => {
    const s = new Set(prev)
    for (const l of elegibles) { if (on) s.add(l.id); else s.delete(l.id) }
    return s
  })

  const agregar = async () => {
    if (sel.size === 0 || busy) return
    if (!confirm(`Se agregarán ${sel.size} lead(s) a la cola. Sofía (IA) les marcará automáticamente en horario laboral. ¿Continuar?`)) return
    setBusy(true); setMsg('')
    try {
      const r = await api.post<{ agregados: number; omitidos: number }>('/campanas', { lead_ids: [...sel] })
      setMsg(`✅ ${r.agregados} agregado(s) a la cola${r.omitidos ? `, ${r.omitidos} omitido(s)` : ''}.`)
      setSel(new Set())
      cargarCola()
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Error al agregar a la cola')
    } finally {
      setBusy(false)
    }
  }

  const cancelar = async () => {
    if (busy || !cola || cola.pendientes.length === 0) return
    if (!confirm(`¿Cancelar las ${cola.pendientes.length} llamada(s) pendiente(s)?`)) return
    setBusy(true); setMsg('')
    try {
      const r = await api.delete<{ cancelados: number }>('/campanas')
      setMsg(`Se cancelaron ${r.cancelados} pendiente(s).`)
      cargarCola()
    } finally {
      setBusy(false)
    }
  }

  const estadoLabel = (k: string) => LEAD_ESTADOS.find(e => e.key === k)?.label ?? k

  return (
    <Modal
      title="📣 Campaña de llamadas con IA"
      onClose={onClose}
      footer={
        <>
          {cola && cola.pendientes.length > 0 && (
            <button className="btn-danger" onClick={cancelar} disabled={busy}>Cancelar pendientes</button>
          )}
          <div className="right">
            <button className="btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn" onClick={agregar} disabled={busy || sel.size === 0}>
              {busy ? 'Agregando…' : `Agregar ${sel.size || ''} a la cola`}
            </button>
          </div>
        </>
      }
    >
      <p className="sub" style={{ marginTop: 0 }}>
        El marcador automático llama <strong>lun–vie de 9:00 a 16:50</strong> (Hermosillo), máximo 2 llamadas
        cada 10 minutos. Cada resultado queda en la ficha del lead y te llega el aviso de siempre.
      </p>

      {cola && (
        <p className="sub">
          En cola: <strong>{cola.pendientes.length}</strong> pendiente(s) · Llamadas iniciadas hoy: <strong>{cola.iniciadas_hoy}</strong>
        </p>
      )}
      {msg && <p className="sub">{msg}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0', flexWrap: 'wrap' }}>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {LEAD_ESTADOS.filter(e => e.key !== 'ganado' && e.key !== 'perdido').map(e => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost" onClick={() => marcarVisibles(true)}>Seleccionar visibles</button>
        <button type="button" className="btn-ghost" onClick={() => marcarVisibles(false)}>Quitar visibles</button>
      </div>

      {elegibles.length === 0 ? (
        <p className="sub">No hay leads elegibles con este filtro (necesitan teléfono y no estar ya en cola).</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 4 }}>
          {elegibles.map(l => (
            <li key={l.id}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: sel.has(l.id) ? 'rgba(139,92,246,.12)' : 'transparent' }}>
                <input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{l.nombre}</strong>
                  <span style={{ opacity: .7 }}>{l.empresa ? ` · ${l.empresa}` : ''} · {l.telefono}</span>
                </span>
                <span className="sub" style={{ whiteSpace: 'nowrap' }}>{estadoLabel(l.estado)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
