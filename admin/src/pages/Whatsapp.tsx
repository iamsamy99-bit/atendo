import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../api'
import { Modal, Badge, Empty } from '../components/ui'
import { fmtFecha } from '../types'

// Bandeja de lo que produce el bot de WhatsApp. Las conversaciones marcadas
// como 'handoff' son las que el bot no pudo resolver y el cliente pidió hablar
// con una persona: van siempre arriba porque son las que se enfrían si nadie
// las ve.

interface Conversacion {
  id: number
  wa_id: string
  telefono: string
  nombre: string | null
  estado: 'activa' | 'cerrada' | 'handoff'
  lead_id: number | null
  last_message_at: string | null
  updated_at: string | null
  mensajes: number
  ultimo_texto: string | null
  ultimo_role: string | null
}

interface Mensaje {
  id: number
  created_at: string
  direction: 'in' | 'out'
  role: 'user' | 'assistant' | 'system'
  kind: string
  text: string | null
}

interface Cita {
  id: number
  source: string
  conversation_id: number | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  status: string
  notes: string | null
  created_at: string
}

const TONO: Record<string, 'red' | 'blue' | 'gray'> = {
  handoff: 'red', activa: 'blue', cerrada: 'gray',
}
const ETIQUETA: Record<string, string> = {
  handoff: 'Necesita humano', activa: 'Activa', cerrada: 'Cerrada',
}

export default function Whatsapp() {
  const [rows, setRows] = useState<Conversacion[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState<(Conversacion & { mensajes: Mensaje[] }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'conversaciones' | 'citas'>('conversaciones')

  const load = useCallback(() => {
    Promise.all([
      api.get<Conversacion[]>('/whatsapp-conversaciones'),
      api.get<Cita[]>('/whatsapp-conversaciones?citas=1'),
    ])
      .then(([c, a]) => { setRows(c); setCitas(a); setError('') })
      .catch(err => setError(err instanceof ApiError
        ? `No se pudo cargar la bandeja: ${err.message}`
        : 'No se pudo cargar la bandeja de WhatsApp.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const abrir = async (c: Conversacion) => {
    try {
      setAbierta(await api.get(`/whatsapp-conversaciones?id=${c.id}`))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir la conversación')
    }
  }

  const cambiarEstado = async (id: number, estado: string) => {
    if (busy) return
    setBusy(true)
    try {
      await api.patch(`/whatsapp-conversaciones?id=${id}`, { estado })
      setAbierta(null)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar')
    } finally {
      setBusy(false)
    }
  }

  const handoffs = rows.filter(r => r.estado === 'handoff').length

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>WhatsApp</h1>
          <p className="sub">
            Conversaciones y citas generadas por el bot.
            {handoffs > 0 && (
              <strong style={{ color: 'var(--red)' }}>
                {' '}{handoffs === 1 ? '1 conversación espera' : `${handoffs} conversaciones esperan`} a una persona.
              </strong>
            )}
          </p>
        </div>
        <button className="btn" onClick={load}>Actualizar</button>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => setTab('conversaciones')}
          style={{ opacity: tab === 'conversaciones' ? 1 : 0.55 }}>
          Conversaciones ({rows.length})
        </button>
        <button className="btn" onClick={() => setTab('citas')}
          style={{ opacity: tab === 'citas' ? 1 : 0.55 }}>
          Citas del bot ({citas.length})
        </button>
      </div>

      {error ? (
        <div className="card" style={{ padding: 24 }}>
          <div className="error-box">{error}</div>
          <button className="btn" style={{ marginTop: 12 }}
            onClick={() => { setError(''); setLoading(true); load() }}>Reintentar</button>
        </div>
      ) : loading ? (
        <Empty icon="⏳" text="Cargando…" />
      ) : tab === 'conversaciones' ? (
        rows.length === 0 ? (
          <Empty icon="💬" text="Todavía no hay conversaciones. Aparecerán aquí en cuanto el bot reciba el primer mensaje." />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Contacto</th><th>Estado</th><th>Último mensaje</th><th>Msgs</th><th>Actividad</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.id} style={c.estado === 'handoff' ? { background: 'var(--red-bg)' } : undefined}>
                      <td>
                        <div className="strong">{c.nombre || c.telefono}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.telefono}</div>
                      </td>
                      <td><Badge tone={TONO[c.estado] ?? 'gray'}>{ETIQUETA[c.estado] ?? c.estado}</Badge></td>
                      <td style={{ maxWidth: 320 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          {c.ultimo_role === 'assistant' ? 'Bot: ' : ''}
                          {(c.ultimo_texto || '—').slice(0, 90)}
                        </span>
                      </td>
                      <td>{c.mensajes}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtFecha(c.last_message_at || c.updated_at)}</td>
                      <td><button className="btn" onClick={() => abrir(c)}>Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : citas.length === 0 ? (
        <Empty icon="📅" text="El bot todavía no ha agendado citas." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th>Cliente</th><th>Contacto</th><th>Solicitó</th><th>Estado</th><th>Creada</th></tr>
              </thead>
              <tbody>
                {citas.map(a => (
                  <tr key={a.id}>
                    <td className="strong">{a.customer_name || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {a.customer_phone}
                      {a.customer_email && <div style={{ color: 'var(--muted)' }}>{a.customer_email}</div>}
                    </td>
                    <td>{a.notes || '—'}</td>
                    <td><Badge tone={a.status === 'pendiente' ? 'amber' : 'green'}>{a.status}</Badge></td>
                    <td style={{ fontSize: '0.78rem' }}>{fmtFecha(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abierta && (
        <Modal
          title={`💬 ${abierta.nombre || abierta.telefono}`}
          onClose={() => setAbierta(null)}
          footer={
            <>
              {abierta.estado === 'handoff' && (
                <button className="btn" disabled={busy}
                  onClick={() => cambiarEstado(abierta.id, 'activa')}>
                  Ya lo atendí
                </button>
              )}
              {abierta.estado !== 'cerrada' && (
                <button className="btn" disabled={busy}
                  onClick={() => cambiarEstado(abierta.id, 'cerrada')}>
                  Cerrar conversación
                </button>
              )}
            </>
          }
        >
          <div style={{ maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {abierta.mensajes.length === 0 && <p className="sub">Sin mensajes registrados.</p>}
            {abierta.mensajes.map(m => (
              <div key={m.id} style={{
                alignSelf: m.direction === 'in' ? 'flex-start' : 'flex-end',
                maxWidth: '80%',
                background: m.role === 'system' ? 'var(--red-bg)'
                  : m.direction === 'in' ? 'var(--bg-alt)' : 'var(--blue-light)',
                borderRadius: 10, padding: '8px 12px', fontSize: '0.85rem',
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 2 }}>
                  {m.role === 'user' ? 'Cliente' : m.role === 'assistant' ? 'Bot' : 'Sistema'}
                  {' · '}{fmtFecha(m.created_at)}
                </div>
                {m.text}
              </div>
            ))}
          </div>
          <p className="sub" style={{ marginTop: 12 }}>
            El teléfono es <strong>{abierta.telefono}</strong>
            {abierta.lead_id && <> · ligada al lead #{abierta.lead_id}</>}
          </p>
        </Modal>
      )}
    </div>
  )
}
