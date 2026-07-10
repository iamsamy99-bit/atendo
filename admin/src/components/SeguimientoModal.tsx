import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Badge } from './ui'
import { LEAD_ESTADOS, type LeadEstado } from '../types'

interface DestResp { total: number; con_email: number; sin_email: number; sin_email_lista: string[] }
interface Plantilla { id: string; nombre: string; categoria: string; asunto: string; cuerpo: string; ctaLabel: string; ctaUrl: string }
interface PreviewResp { para: string; asunto: string; html: string }

export default function SeguimientoModal({ onClose }: { onClose: () => void }) {
  const [estado, setEstado] = useState<LeadEstado>('contactado')
  const [dest, setDest] = useState<DestResp | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [plantillaId, setPlantillaId] = useState('')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [cta, setCta] = useState<{ ctaLabel: string; ctaUrl: string }>({ ctaLabel: '', ctaUrl: '' })
  const [preview, setPreview] = useState<PreviewResp | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ enviados: number; fallidos: number; errores: string[] } | null>(null)

  // Cargar plantillas y aplicar la primera por defecto
  useEffect(() => {
    api.get<Plantilla[]>('/seguimiento/plantillas').then(ps => {
      setPlantillas(ps)
      if (ps[0]) aplicar(ps[0])
    }).catch(() => setError('No se pudieron cargar las plantillas.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aplicar = (p: Plantilla) => {
    setPlantillaId(p.id)
    setAsunto(p.asunto)
    setCuerpo(p.cuerpo)
    setCta({ ctaLabel: p.ctaLabel, ctaUrl: p.ctaUrl })
  }

  useEffect(() => {
    setDest(null)
    api.get<DestResp>(`/seguimiento/destinatarios?estado=${estado}`).then(setDest).catch(() => {})
  }, [estado])

  // Vista previa en vivo (render real del servidor), con debounce
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!asunto && !cuerpo) return
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => {
      api.post<PreviewResp>('/seguimiento/preview', { estado, asunto, cuerpo, ...cta })
        .then(setPreview).catch(() => {})
    }, 500)
    return () => { if (t.current) clearTimeout(t.current) }
  }, [asunto, cuerpo, cta, estado])

  const enviar = async () => {
    if (busy || !dest || dest.con_email === 0) return
    if (!confirm(`Enviar a ${dest.con_email} lead(s) en estado "${LEAD_ESTADOS.find(e => e.key === estado)?.label}"?`)) return
    setBusy(true); setError('')
    try {
      const r = await api.post<{ enviados: number; fallidos: number; errores: string[] }>('/seguimiento/enviar', { estado, asunto, cuerpo, ...cta })
      setResultado(r)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al enviar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Enviar seguimiento por correo"
      onClose={onClose}
      footer={resultado ? (
        <div className="right"><button className="btn" onClick={onClose}>Cerrar</button></div>
      ) : (
        <div className="right">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={enviar} disabled={busy || !dest || dest.con_email === 0}>
            {busy ? 'Enviando…' : `Enviar a ${dest?.con_email ?? 0}`}
          </button>
        </div>
      )}
    >
      {error && <div className="error-box">{error}</div>}

      {resultado ? (
        <div>
          <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>✓ {resultado.enviados} enviados</p>
          {resultado.fallidos > 0 && (
            <>
              <p style={{ color: 'var(--red)', marginBottom: 6 }}>{resultado.fallidos} fallidos:</p>
              <ul style={{ fontSize: '0.85rem', color: 'var(--muted)', paddingLeft: 18 }}>
                {resultado.errores.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 10 }}>
            Cada envío quedó registrado y los leads se marcaron con la fecha de seguimiento.
          </p>
        </div>
      ) : (
        <>
          <Field label="Plantilla">
            <select value={plantillaId} onChange={e => {
              const p = plantillas.find(x => x.id === e.target.value)
              if (p) aplicar(p)
            }}>
              {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.categoria}</option>)}
            </select>
          </Field>

          <Field label="Enviar a los leads en estado">
            <select value={estado} onChange={e => setEstado(e.target.value as LeadEstado)}>
              {LEAD_ESTADOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>

          {dest && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '2px 0 16px' }}>
              <Badge tone={dest.con_email > 0 ? 'green' : 'gray'}>{dest.con_email} con email</Badge>
              {dest.sin_email > 0 && <Badge tone="amber">{dest.sin_email} sin email (se omiten)</Badge>}
            </div>
          )}

          <Field label="Asunto">
            <input value={asunto} onChange={e => setAsunto(e.target.value)} />
          </Field>
          <Field label="Mensaje">
            <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} style={{ minHeight: 150 }} />
          </Field>

          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: -6, marginBottom: 14 }}>
            Marcadores: <code>{'{primer_nombre}'}</code> <code>{'{empresa}'}</code> <code>{'{plan}'}</code> <code>{'{industria}'}</code> · <code>{'{beneficios}'}</code> muestra ventajas según lo que le interesó a cada lead.
          </p>

          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--bg-alt)', padding: '8px 14px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Vista previa {preview ? `— así lo verá ${preview.para}` : ''}
            </div>
            {preview
              ? <iframe title="preview" srcDoc={preview.html} style={{ width: '100%', height: 460, border: 'none', background: '#f3f4f6' }} />
              : <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted-light)' }}>Generando vista previa…</div>}
          </div>
        </>
      )}
    </Modal>
  )
}
