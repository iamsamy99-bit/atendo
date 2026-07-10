import { useState, useEffect } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Badge } from './ui'
import { LEAD_ESTADOS, type LeadEstado } from '../types'

interface Destinatario { id: number; nombre: string; email: string | null; empresa: string | null; plan_interes: string | null }
interface DestResp { total: number; con_email: number; sin_email: number; destinatarios: Destinatario[]; sin_email_lista: string[] }

const ASUNTO_DEFAULT = '{primer_nombre}, ¿seguimos con lo de {plan}?'
const CUERPO_DEFAULT = `Hola {primer_nombre},

Gracias por tu interés en Atendo para {empresa}. Quería saber si sigues considerando {plan} o si te quedó alguna duda.

Si te late, podemos agendar una llamada corta esta semana para mostrarte cómo funcionaría en tu caso.

Quedo al pendiente,
Samuel — Atendo`

// Vista previa local de los placeholders con el primer destinatario real.
function previsualizar(texto: string, d?: Destinatario): string {
  const nombre = d?.nombre ?? 'Juan Pérez'
  const primer = nombre.split(/\s+/)[0]
  return texto
    .replace(/\{primer_nombre\}/g, primer)
    .replace(/\{nombre\}/g, nombre)
    .replace(/\{empresa\}/g, d?.empresa ?? 'tu negocio')
    .replace(/\{plan\}/g, d?.plan_interes ?? 'el servicio que consultaste')
    .replace(/\{\w+\}/g, '…')
}

export default function SeguimientoModal({ onClose }: { onClose: () => void }) {
  const [estado, setEstado] = useState<LeadEstado>('contactado')
  const [dest, setDest] = useState<DestResp | null>(null)
  const [asunto, setAsunto] = useState(ASUNTO_DEFAULT)
  const [cuerpo, setCuerpo] = useState(CUERPO_DEFAULT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ enviados: number; fallidos: number; errores: string[] } | null>(null)

  useEffect(() => {
    setDest(null)
    api.get<DestResp>(`/seguimiento/destinatarios?estado=${estado}`).then(setDest).catch(() => setError('No se pudieron cargar los destinatarios.'))
  }, [estado])

  const enviar = async () => {
    if (busy || !dest || dest.con_email === 0) return
    if (!confirm(`Enviar el correo a ${dest.con_email} lead(s) en estado "${LEAD_ESTADOS.find(e => e.key === estado)?.label}"?`)) return
    setBusy(true); setError('')
    try {
      const r = await api.post<{ enviados: number; fallidos: number; errores: string[] }>('/seguimiento/enviar', { estado, asunto, cuerpo })
      setResultado(r)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al enviar')
    } finally {
      setBusy(false)
    }
  }

  const primero = dest?.destinatarios[0]

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
            <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} style={{ minHeight: 160 }} />
          </Field>

          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: -6, marginBottom: 14 }}>
            Marcadores: <code>{'{primer_nombre}'}</code> <code>{'{nombre}'}</code> <code>{'{empresa}'}</code> <code>{'{plan}'}</code> <code>{'{industria}'}</code> — se rellenan con los datos de cada lead.
          </p>

          <div style={{ background: 'var(--bg-alt)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
              Vista previa {primero ? `— ${primero.nombre}` : ''}
            </p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{previsualizar(asunto, primero)}</p>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{previsualizar(cuerpo, primero)}</p>
          </div>
        </>
      )}
    </Modal>
  )
}
