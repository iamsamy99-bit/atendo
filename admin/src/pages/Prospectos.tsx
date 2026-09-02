import { useEffect, useState, useCallback, useMemo } from 'react'
import { api, ApiError } from '../api'
import { Modal, Field, Form, Empty, Badge } from '../components/ui'
import { LEAD_ESTADOS, hoyISO, type Lead, type LeadEstado } from '../types'
import { splitCsvLine } from '../csv'

const EMPTY_PROSPECT: Partial<Lead> = {
  canal: 'otro',
  origen: 'prospeccion',
  estado: 'nuevo',
  idioma: 'es',
  plan_interes: 'Esencial'
}

type TemplateKey = 'dental' | 'medica' | 'spa' | 'general'

interface TemplateData {
  label: string
  whatsapp: (p: Partial<Lead>) => string
  email: {
    asunto: string
    cuerpo: string
    ctaLabel: string
    ctaUrl: string
  }
}

const TEMPLATES: Record<TemplateKey, TemplateData> = {
  dental: {
    label: '🦷 Clínica Dental / Odontología',
    whatsapp: (p) => {
      const contactName = (p.nombre || '').split(' ')[0] || 'doctor'
      return `Hola Dr./Dra. ${contactName}, buenas tardes. Vi su clínica ${p.empresa || 'su consultorio'}. Le escribo de Atendo. Diseñamos recepcionistas virtuales con inteligencia artificial (como 'Diego' y 'Sofía') que contestan llamadas 24/7 y agendan citas automáticamente en su calendario. Ningún paciente se queda sin cita. ¿Le interesaría escuchar una demo de 30 segundos?`
    },
    email: {
      asunto: '¿Cuántas llamadas de pacientes pierde {empresa} fuera de horario?',
      cuerpo: 'Hola Dr./Dra. {nombre},\n\nEspero que se encuentre excelente.\n\nRevisando la información de {empresa}, notamos el gran trabajo que hacen en odontología. Sin embargo, en clínicas dentales promedio se pierde hasta un 35% de citas simplemente porque los pacientes llaman fuera de horario o cuando la recepción está ocupada.\n\nEn Atendo creamos agentes de voz con inteligencia artificial entrenados específicamente para consultorios dentales.\n\nNuestro asistente contesta al primer timbre, responde preguntas sobre tratamientos y precios, y agenda directamente en su calendario 24/7.\n\n{beneficios}\n\n¿Tendría 10 minutos esta semana para una llamada rápida donde le muestre cómo funciona para su consultorio?',
      ctaLabel: 'Ver disponibilidad y agendar demo',
      ctaUrl: 'https://cal.com/samuel-garcia-gbsw4p/30min'
    }
  },
  medica: {
    label: '⚕️ Consultorio Médico / Clínica',
    whatsapp: (p) => {
      const contactName = (p.nombre || '').split(' ')[0] || 'doctor'
      return `Hola Dr./Dra. ${contactName}, ¿cómo está? Vi su clínica ${p.empresa || 'su consultorio'}. En Atendo creamos asistentes de voz con IA que responden dudas de consultas y precios, confirman horarios y enlazan urgencias 24/7. Suena como una persona real. ¿Le interesaría que le mande una demo rápida para su especialidad?`
    },
    email: {
      asunto: 'Optimizando la recepción y agenda de {empresa} con IA 24/7',
      cuerpo: 'Hola Dr./Dra. {nombre},\n\nEspero que se encuentre muy bien.\n\nSabemos que en el sector médico, contestar rápido es vital: un paciente que no obtiene respuesta llama a la siguiente opción. En Atendo ayudamos a consultorios y clínicas como {empresa} a contestar el 100% de sus llamadas.\n\nCreamos agentes de voz con inteligencia artificial bilingües que atienden 24/7, explican requisitos de la consulta y agendan citas en tiempo real.\n\n{beneficios}\n\n¿Le interesaría agendar una demo gratuita de 15 minutos en vivo para escuchar a nuestro asistente en acción?',
      ctaLabel: 'Agendar demo gratuita',
      ctaUrl: 'https://cal.com/samuel-garcia-gbsw4p/30min'
    }
  },
  spa: {
    label: '💅 Spa / Estética / Bienestar',
    whatsapp: (p) => {
      const contactName = (p.nombre || '').split(' ')[0] || 'hola'
      return `Hola ${contactName}, ¿cómo están en ${p.empresa || 'su negocio'}? Les escribo de Atendo. Creamos asistentes virtuales de voz y WhatsApp con IA que contestan dudas, dan precios y agendan citas las 24 horas. Así su equipo se enfoca en consentir a las clientes en cabina. ¿Les gustaría probar una demo gratis?`
    },
    email: {
      asunto: 'Aumenten sus citas en {empresa} con recepción virtual 24/7',
      cuerpo: 'Hola {nombre},\n\n¿Cómo están en {empresa}?\n\nEn la industria de belleza y bienestar, muchas citas se pierden por no responder los mensajes de WhatsApp o llamadas de inmediato mientras están atendiendo a un cliente.\n\nEn Atendo creamos asistentes con inteligencia artificial que contestan al instante por teléfono y WhatsApp, cotizan servicios y agendan en su sistema 24/7.\n\n{beneficios}\n\n¿Les gustaría escuchar cómo suena su propio recepcionista virtual en una demo gratuita?',
      ctaLabel: 'Agendar demo de 30 min',
      ctaUrl: 'https://cal.com/samuel-garcia-gbsw4p/30min'
    }
  },
  general: {
    label: '🏢 General / Otro Sector',
    whatsapp: (p) => {
      const contactName = (p.nombre || '').split(' ')[0] || 'hola'
      return `Hola ${contactName}, espero que estés muy bien. Vi tu negocio ${p.empresa || 'su negocio'}. En Atendo creamos agentes de voz y chat con IA que contestan al instante 24/7 y agendan citas para que nunca pierdas un cliente por falta de atención. ¿Te gustaría escuchar cómo habla nuestro asistente en una demo de 30 segundos?`
    },
    email: {
      asunto: 'Recepción telefónica y de WhatsApp automática 24/7 para {empresa}',
      cuerpo: 'Hola {nombre},\n\nEspero que estés teniendo un excelente día.\n\nTe escribo brevemente porque en Atendo ayudamos a negocios a automatizar su atención telefónica y digital.\n\nCreamos agentes de voz con inteligencia artificial que hablan de forma 100% natural, responden dudas frecuentes y agendan citas directamente en tu calendario sin necesidad de personal adicional.\n\n{beneficios}\n\n¿Tienes 15 minutos esta semana para una demo virtual rápida donde escuches al agente?',
      ctaLabel: 'Agendar llamada demo',
      ctaUrl: 'https://cal.com/samuel-garcia-gbsw4p/30min'
    }
  }
}

export default function Prospectos() {
  const [prospects, setProspects] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  
  // Modales
  const [editing, setEditing] = useState<Partial<Lead> | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [pitchLead, setPitchLead] = useState<Lead | null>(null)

  // Datos del Pitch
  const [pitchTemplate, setPitchTemplate] = useState<TemplateKey>('general')
  const [pitchChannel, setPitchChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailCtaLabel, setEmailCtaLabel] = useState('')
  const [emailCtaUrl, setEmailCtaUrl] = useState('')
  const [waText, setWaText] = useState('')

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const cargar = useCallback(() => {
    api.get<Lead[]>('/prospectos')
      .then(list => { setProspects(list); setError('') })
      .catch(err => setError(
        err instanceof ApiError ? `No se pudieron cargar los prospectos: ${err.message}` : 'No se pudieron cargar los prospectos.'
      ))
      .finally(() => setLoading(false))
  }, [])

  useEffect(cargar, [cargar])

  // Al abrir el Pitch, cargar variables y plantilla inicial
  useEffect(() => {
    if (!pitchLead) return
    
    // Auto-detectar plantilla por industria/especialidad
    const ind = (pitchLead.industria || '').toLowerCase()
    let initialTemplate: TemplateKey = 'general'
    if (ind.includes('dent') || ind.includes('odont') || ind.includes('dient')) {
      initialTemplate = 'dental'
    } else if (ind.includes('medic') || ind.includes('clin') || ind.includes('doctor') || ind.includes('pediat') || ind.includes('ginec')) {
      initialTemplate = 'medica'
    } else if (ind.includes('spa') || ind.includes('estet') || ind.includes('salon') || ind.includes('bellez') || ind.includes('masaj')) {
      initialTemplate = 'spa'
    }
    
    setPitchTemplate(initialTemplate)
    setPitchChannel('whatsapp')
    
    // Cargar textos iniciales
    const templ = TEMPLATES[initialTemplate]
    setWaText(templ.whatsapp(pitchLead))
    
    // Cargar email placeholders pre-personalizados
    setEmailSubject(templ.email.asunto.replace('{empresa}', pitchLead.empresa || 'su negocio'))
    setEmailBody(templ.email.cuerpo
      .replace('{nombre}', pitchLead.nombre)
      .replace('{empresa}', pitchLead.empresa || 'su negocio')
      .replace('{industria}', pitchLead.industria || 'su sector')
    )
    setEmailCtaLabel(templ.email.ctaLabel)
    setEmailCtaUrl(templ.email.ctaUrl)
    setMsg('')
  }, [pitchLead])

  // Recalcular textos al cambiar la plantilla
  const handleTemplateChange = (key: TemplateKey) => {
    setPitchTemplate(key)
    if (!pitchLead) return
    const templ = TEMPLATES[key]
    setWaText(templ.whatsapp(pitchLead))
    
    setEmailSubject(templ.email.asunto.replace('{empresa}', pitchLead.empresa || 'su negocio'))
    setEmailBody(templ.email.cuerpo
      .replace('{nombre}', pitchLead.nombre)
      .replace('{empresa}', pitchLead.empresa || 'su negocio')
      .replace('{industria}', pitchLead.industria || 'su sector')
    )
    setEmailCtaLabel(templ.email.ctaLabel)
    setEmailCtaUrl(templ.email.ctaUrl)
  }

  // Filtrado de prospectos
  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      const matchSearch = 
        (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.empresa || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.telefono || '').includes(search) ||
        (p.email || '').toLowerCase().includes(search.toLowerCase())
      
      const ind = (p.industria || '').toLowerCase()
      let matchSpecialty = true
      if (filtroEspecialidad === 'dental') matchSpecialty = ind.includes('dent') || ind.includes('odont')
      else if (filtroEspecialidad === 'medica') matchSpecialty = ind.includes('medic') || ind.includes('clin') || ind.includes('doc')
      else if (filtroEspecialidad === 'spa') matchSpecialty = ind.includes('spa') || ind.includes('estet') || ind.includes('salon')
      else if (filtroEspecialidad === 'otro') {
        matchSpecialty = !ind.includes('dent') && !ind.includes('odont') && 
                         !ind.includes('medic') && !ind.includes('clin') && !ind.includes('doc') &&
                         !ind.includes('spa') && !ind.includes('estet') && !ind.includes('salon')
      }

      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado

      return matchSearch && matchSpecialty && matchEstado
    })
  }, [prospects, search, filtroEspecialidad, filtroEstado])

  // Guardar un prospecto (crear o editar)
  const save = async () => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      if (editing.id) {
        const updated = await api.put<Lead>(`/leads/${editing.id}`, editing)
        setProspects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      } else {
        const created = await api.post<Lead>('/leads', { ...editing, origen: 'prospeccion', canal: 'otro' })
        setProspects(prev => [created, ...prev])
      }
      setEditing(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar el prospecto')
    } finally {
      setBusy(false)
    }
  }

  // Eliminar un prospecto
  const remove = async (id: number) => {
    if (!confirm('¿Eliminar este prospecto del sistema? No se puede deshacer.')) return
    try {
      await api.delete(`/leads/${id}`)
      setProspects(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('No se pudo eliminar el prospecto.')
    }
  }

  // Actualizar el estado de forma rápida
  const setQuickEstado = async (id: number, nuevoEst: LeadEstado) => {
    try {
      const updated = await api.put<Lead>(`/leads/${id}`, { estado: nuevoEst })
      setProspects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    } catch {
      alert('Error al actualizar el estado')
    }
  }

  // Importar en lote
  const handleImport = async () => {
    if (!importText.trim() || busy) return
    setBusy(true)
    const lines = importText.split('\n')
    const parsed = lines.map(line => {
      const parts = splitCsvLine(line)
      const nombre = (parts[0] ?? '').trim()
      const empresa = (parts[1] ?? '').trim()
      const telefono = (parts[2] ?? '').trim()
      const email = (parts[3] ?? '').trim()
      const industria = (parts[4] ?? '').trim()
      const necesidad = (parts[5] ?? '').trim()
      const plan_interes = (parts[6] ?? 'Esencial').trim()
      return { nombre, empresa, telefono, email, industria, necesidad, plan_interes }
    }).filter(p => p.nombre && p.nombre.toLowerCase() !== 'nombre')

    if (parsed.length === 0) {
      alert('No se encontraron registros válidos. Asegúrate de incluir al menos el Nombre en la primera columna.')
      setBusy(false)
      return
    }

    try {
      const res = await api.post<{ agregados: number; omitidos: number }>('/prospectos', { prospects: parsed })
      alert(`Importación completada:\n- ${res.agregados} prospectos agregados correctamente.\n- ${res.omitidos} omitidos (por duplicados o datos incompletos).`)
      setImportText('')
      setImportOpen(false)
      cargar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error en la importación')
    } finally {
      setBusy(false)
    }
  }

  // Enviar WhatsApp (Genera el link de WhatsApp Web)
  const sendWhatsApp = async () => {
    if (!pitchLead || !pitchLead.telefono) return
    
    // Sanitizar teléfono para link de WhatsApp
    const rawTel = pitchLead.telefono.replace(/[^\d]/g, '')
    const tel = rawTel.length === 10 ? `52${rawTel}` : rawTel

    const url = `https://web.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(waText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    
    // Marcar como contactado
    await setQuickEstado(pitchLead.id, 'contactado')
    setPitchLead(null)
  }

  // Enviar Email por Resend
  const sendEmail = async () => {
    if (!pitchLead || busy) return
    setBusy(true); setMsg('')
    try {
      await api.post('/prospectos/enviar-email', {
        leadId: pitchLead.id,
        asunto: emailSubject,
        cuerpo: emailBody,
        ctaLabel: emailCtaLabel,
        ctaUrl: emailCtaUrl
      })
      setMsg('✅ ¡Correo enviado correctamente vía Resend!')
      await setQuickEstado(pitchLead.id, 'contactado')
      setTimeout(() => {
        setPitchLead(null)
      }, 1500)
    } catch (err) {
      setMsg(err instanceof ApiError ? `❌ Error: ${err.message}` : '❌ Error al enviar el correo')
    } finally {
      setBusy(false)
    }
  }

  // Lanzar llamada IA de forma inmediata con Sofía
  const llamarConIA = async (lead: Lead) => {
    if (!lead.telefono) return
    if (!confirm(`¿Desea iniciar una llamada outbound inmediata con la asistente Sofía al número ${lead.telefono}?`)) return
    
    try {
      await api.post('/llamadas-ia', { lead_id: lead.id })
      alert(`📞 Llamada iniciada al número ${lead.telefono}. Al colgar se registrará el resumen.`)
      await setQuickEstado(lead.id, 'contactado')
      cargar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al iniciar la llamada con IA')
    }
  }

  // Agregar a la cola de la campaña (cron)
  const agendarEnCampana = async (lead: Lead) => {
    if (!lead.telefono) return
    try {
      await api.post('/campanas', { lead_ids: [lead.id] })
      alert(`📣 Se agregó a "${lead.nombre}" a la cola de llamadas automáticas de Sofía.`)
      cargar()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error al agregar a la campaña')
    }
  }

  // Copiar al portapapeles. La API falla en origenes no seguros o si el
  // permiso esta denegado; sin await el alert mentia y el operador pegaba
  // contenido viejo en WhatsApp.
  const copiarPortapapeles = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      alert('¡Copiado al portapapeles!')
    } catch {
      alert('No se pudo copiar automáticamente. Selecciona el texto y cópialo con Ctrl+C.')
    }
  }

  const getBadgeTone = (est: string) => {
    if (est === 'nuevo') return 'blue'
    if (est === 'contactado') return 'amber'
    if (est === 'ganado') return 'green'
    if (est === 'perdido') return 'red'
    return 'gray'
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Prospector IA ⚡</h1>
          <p className="sub">Agente de prospección: importa consultorios, redacta ofertas con IA y contáctalos por WhatsApp, Email o llamadas automáticas</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setImportOpen(true)}>📥 Importar Consultorios</button>
          <button className="btn" onClick={() => setEditing({ ...EMPTY_PROSPECT })}>+ Nuevo Prospecto</button>
        </div>
      </div>

      {/* Tarjeta de Estadísticas de Prospección */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
        <div className="stat accent">
          <div className="label">Total Prospectos</div>
          <div className="value">{prospects.length}</div>
        </div>
        <div className="stat">
          <div className="label">Nuevos</div>
          <div className="value">{prospects.filter(p => p.estado === 'nuevo').length}</div>
        </div>
        <div className="stat">
          <div className="label">Contactados</div>
          <div className="value">{prospects.filter(p => p.estado === 'contactado').length}</div>
        </div>
        <div className="stat">
          <div className="label">Demo Agendada</div>
          <div className="value">{prospects.filter(p => p.estado === 'demo_agendada').length}</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input 
              type="text" 
              placeholder="Buscar por clínica, contacto, teléfono..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}
            />
          </div>
          <div style={{ minWidth: 150 }}>
            <select 
              value={filtroEspecialidad} 
              onChange={e => setFiltroEspecialidad(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}
            >
              <option value="todos">Todas las Especialidades</option>
              <option value="dental">🦷 Dental / Odontología</option>
              <option value="medica">⚕️ Médica / Especialistas</option>
              <option value="spa">💅 Spa / Estética</option>
              <option value="otro">🏢 Otras Industrias</option>
            </select>
          </div>
          <div style={{ minWidth: 150 }}>
            <select 
              value={filtroEstado} 
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}
            >
              <option value="todos">Todos los Estados</option>
              {LEAD_ESTADOS.map(e => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listado de Prospectos.
          El error y el estado de carga se distinguen del vacío real: antes un
          fallo del GET (p. ej. 401 por sesión vencida) pintaba "no se
          encontraron prospectos" y parecía una lista vacía, no una falla. */}
      {error ? (
        <div className="card" style={{ padding: 24 }}>
          <div className="error-box">{error}</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => { setError(''); setLoading(true); cargar() }}>
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <Empty icon="⏳" text="Cargando prospectos…" />
      ) : filteredProspects.length === 0 ? (
        <Empty icon="⚡" text="No se encontraron prospectos con los filtros actuales. Prueba importando una lista o agregando uno individualmente." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Clínica / Contacto</th>
                  <th style={{ padding: '12px 16px' }}>Especialidad</th>
                  <th style={{ padding: '12px 16px' }}>Contacto Directo</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones rápidas de Prospección</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }} className="table-row-hover">
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.empresa || '—'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>👤 {p.nombre}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <Badge tone="gray">{p.industria || 'General'}</Badge>
                      {p.plan_interes && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>Interés: {p.plan_interes}</div>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {p.telefono && (
                        <div style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          📞 {p.telefono}
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '2px 4px', fontSize: 10 }} 
                            onClick={() => copiarPortapapeles(p.telefono!)}
                            title="Copiar Teléfono"
                          >
                            📋
                          </button>
                        </div>
                      )}
                      {p.email && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          ✉️ {p.email}
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '2px 4px', fontSize: 10 }} 
                            onClick={() => copiarPortapapeles(p.email!)}
                            title="Copiar Correo"
                          >
                            📋
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <select
                        value={p.estado}
                        onChange={e => setQuickEstado(p.id, e.target.value as LeadEstado)}
                        style={{
                          background: 'var(--bg-alt)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '4px 8px',
                          fontSize: '0.82rem',
                          color: 'var(--ink)'
                        }}
                      >
                        {LEAD_ESTADOS.map(e => (
                          <option key={e.key} value={e.key}>{e.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.78rem', 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                          }}
                          onClick={() => setPitchLead(p)}
                        >
                          ⚡ Contactar
                        </button>
                        
                        {p.telefono && (
                          <>
                            <button 
                              className="btn-ghost" 
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={() => llamarConIA(p)}
                              title="Llamar con IA inmediatamente"
                            >
                              📞 Sofía Directo
                            </button>
                            <button 
                              className="btn-ghost" 
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={() => agendarEnCampana(p)}
                              title="Agregar a la cola de la campaña de llamadas automáticas"
                            >
                              ⏰ Cola Campaña
                            </button>
                          </>
                        )}
                        
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                          onClick={() => setEditing(p)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '6px 8px', color: 'var(--red)', fontSize: '0.78rem' }}
                          onClick={() => remove(p.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Importación Masiva */}
      {importOpen && (
        <Modal 
          title="📥 Importación masiva de consultorios" 
          onClose={() => setImportOpen(false)}
          footer={
            <div className="right">
              <button className="btn-ghost" onClick={() => setImportOpen(false)}>Cancelar</button>
              <button className="btn" onClick={handleImport} disabled={busy || !importText.trim()}>
                {busy ? 'Importando…' : 'Comenzar Importación'}
              </button>
            </div>
          }
        >
          <p className="sub" style={{ marginTop: 0 }}>
            Pega una lista de consultorios/clínicas. Puedes separar las columnas usando comas (CSV), tabuladores (copiado de Excel) o punto y coma.
          </p>
          <div style={{ background: 'var(--bg-alt)', padding: 12, borderRadius: 8, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
            <strong>Formato esperado (1 línea por clínica):</strong><br />
            <code>Nombre de contacto, Nombre de Clínica, Teléfono, Correo, Especialidad/Industria, Nota de Necesidad, Plan de interés</code><br />
            <br />
            <strong>Ejemplo:</strong><br />
            <code>Dr. Juan Pérez, Clínica Dental Juárez, 5512345678, contacto@dentaljuarez.com, dental, Recepción y citas, Esencial</code>
          </div>
          <Field label="Pega los registros aquí:">
            <textarea 
              value={importText} 
              onChange={e => setImportText(e.target.value)} 
              placeholder="Dr. Juan Pérez, Clínica Dental Juárez, 5512345678, contacto@dentaljuarez.com, dental" 
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </Field>
        </Modal>
      )}

      {/* Modal: Agregar / Editar Prospecto */}
      {editing && (
        <Modal
          title={editing.id ? `Editar Prospecto: ${editing.nombre}` : 'Nuevo Prospecto'}
          onClose={() => setEditing(null)}
          footer={
            <div className="right">
              <button className="btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
          }
        >
          {error && <div className="error-box">{error}</div>}
          <Form onSubmit={save}>
            <div className="form-grid">
              <Field label="Nombre del contacto *">
                <input 
                  value={editing.nombre ?? ''} 
                  onChange={e => setEditing(prev => ({ ...prev, nombre: e.target.value }))} 
                  required 
                  placeholder="Ej. Dr. Samuel García"
                />
              </Field>
              <Field label="Nombre de la clínica / negocio">
                <input 
                  value={editing.empresa ?? ''} 
                  onChange={e => setEditing(prev => ({ ...prev, empresa: e.target.value }))} 
                  placeholder="Ej. Clínica Dental Vista"
                />
              </Field>
              <Field label="Teléfono">
                <input 
                  value={editing.telefono ?? ''} 
                  onChange={e => setEditing(prev => ({ ...prev, telefono: e.target.value }))} 
                  placeholder="10 dígitos con código de país (+52)"
                />
              </Field>
              <Field label="Email de contacto">
                <input 
                  type="email" 
                  value={editing.email ?? ''} 
                  onChange={e => setEditing(prev => ({ ...prev, email: e.target.value }))} 
                  placeholder="Ej. contacto@clinicavista.com"
                />
              </Field>
              <Field label="Industria / Especialidad">
                <input 
                  value={editing.industria ?? ''} 
                  onChange={e => setEditing(prev => ({ ...prev, industria: e.target.value }))} 
                  placeholder="Ej. dental, medica, spa, general"
                />
              </Field>
              <Field label="Plan de interés">
                <input 
                  value={editing.plan_interes ?? 'Esencial'} 
                  onChange={e => setEditing(prev => ({ ...prev, plan_interes: e.target.value }))} 
                  placeholder="Esencial, Negocio, Empresa..."
                />
              </Field>
              <div className="full">
                <Field label="Notas y Necesidades">
                  <textarea 
                    value={editing.notas ?? ''} 
                    onChange={e => setEditing(prev => ({ ...prev, notas: e.target.value }))} 
                    placeholder="Detalles sobre el consultorio, horarios en que atienden, etc."
                    style={{ minHeight: 80 }}
                  />
                </Field>
              </div>
            </div>
            <button type="submit" hidden />
          </Form>
        </Modal>
      )}

      {/* Modal Interactivo: Asistente de Prospección / Pitch */}
      {pitchLead && (
        <Modal
          title={`⚡ Oferta de Servicios para: ${pitchLead.empresa || pitchLead.nombre}`}
          onClose={() => setPitchLead(null)}
          footer={
            <div className="right">
              <button className="btn-ghost" onClick={() => setPitchLead(null)}>Cerrar</button>
              {pitchChannel === 'whatsapp' ? (
                <button 
                  className="btn" 
                  onClick={sendWhatsApp} 
                  disabled={!pitchLead.telefono}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  💬 Enviar WhatsApp Web
                </button>
              ) : (
                <button className="btn" onClick={sendEmail} disabled={busy || !pitchLead.email}>
                  {busy ? 'Enviando Correo…' : '✉️ Enviar con Resend'}
                </button>
              )}
            </div>
          }
        >
          {msg && (
            <div className="info-box" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: 12, borderRadius: 8, color: '#10b981', marginBottom: 16, fontSize: '0.88rem' }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, minHeight: 380 }}>
            {/* Opciones de Pitch */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <strong style={{ fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Configurar Mensaje</strong>
              
              <Field label="Especialidad de Clínica">
                <select 
                  value={pitchTemplate} 
                  onChange={e => handleTemplateChange(e.target.value as TemplateKey)}
                  style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', padding: 8, borderRadius: 8, fontSize: '0.85rem' }}
                >
                  {Object.entries(TEMPLATES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Canal de Contacto">
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className={`btn-ghost ${pitchChannel === 'whatsapp' ? 'active' : ''}`}
                    style={{ 
                      flex: 1, 
                      padding: 10, 
                      borderRadius: 8, 
                      fontSize: '0.85rem',
                      borderColor: pitchChannel === 'whatsapp' ? '#10b981' : 'var(--border)',
                      color: pitchChannel === 'whatsapp' ? '#10b981' : 'var(--muted)'
                    }}
                    onClick={() => setPitchChannel('whatsapp')}
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    type="button"
                    className={`btn-ghost ${pitchChannel === 'email' ? 'active' : ''}`}
                    style={{ 
                      flex: 1, 
                      padding: 10, 
                      borderRadius: 8, 
                      fontSize: '0.85rem',
                      borderColor: pitchChannel === 'email' ? 'var(--blue)' : 'var(--border)',
                      color: pitchChannel === 'email' ? 'var(--blue)' : 'var(--muted)'
                    }}
                    onClick={() => setPitchChannel('email')}
                  >
                    ✉️ Correo
                  </button>
                </div>
              </Field>

              <div style={{ background: 'var(--bg-alt)', padding: 12, borderRadius: 8, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8 }}>
                <strong>Datos Detectados:</strong>
                <div style={{ marginTop: 4 }}>🏢 Negocio: {pitchLead.empresa || '—'}</div>
                <div>👤 Contacto: {pitchLead.nombre}</div>
                <div>📞 Tel: {pitchLead.telefono || 'Sin teléfono'}</div>
                <div>✉️ Email: {pitchLead.email || 'Sin correo'}</div>
              </div>
            </div>

            {/* Redacción y Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pitchChannel === 'whatsapp' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem' }}>Redacción del WhatsApp</strong>
                    <Badge tone="green">WhatsApp Directo</Badge>
                  </div>
                  {!pitchLead.telefono && (
                    <div style={{ color: 'var(--red)', fontSize: '0.82rem' }}>⚠️ El prospecto no tiene número de teléfono registrado.</div>
                  )}
                  <textarea
                    value={waText}
                    onChange={e => setWaText(e.target.value)}
                    style={{ flex: 1, minHeight: 180, fontSize: '0.88rem', lineHeight: '1.45', background: 'var(--bg-alt)' }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleTemplateChange(pitchTemplate)}>
                      Restablecer Mensaje
                    </button>
                    <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => copiarPortapapeles(waText)}>
                      Copiar Texto
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem' }}>Redacción del Correo (Resend)</strong>
                    <Badge tone="blue">HTML Corporativo</Badge>
                  </div>
                  {!pitchLead.email && (
                    <div style={{ color: 'var(--red)', fontSize: '0.82rem' }}>⚠️ El prospecto no tiene dirección de correo electrónico.</div>
                  )}
                  <Field label="Asunto del correo">
                    <input 
                      value={emailSubject} 
                      onChange={e => setEmailSubject(e.target.value)}
                      style={{ background: 'var(--bg-alt)' }}
                    />
                  </Field>
                  <Field label="Cuerpo del mensaje">
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      style={{ flex: 1, minHeight: 180, fontSize: '0.85rem', lineHeight: '1.5', fontFamily: 'sans-serif', background: 'var(--bg-alt)' }}
                    />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="Etiqueta del Botón (CTA)">
                      <input 
                        value={emailCtaLabel} 
                        onChange={e => setEmailCtaLabel(e.target.value)}
                        style={{ background: 'var(--bg-alt)', fontSize: '0.8rem' }}
                      />
                    </Field>
                    <Field label="Enlace del Botón (CTA Url)">
                      <input 
                        value={emailCtaUrl} 
                        onChange={e => setEmailCtaUrl(e.target.value)}
                        style={{ background: 'var(--bg-alt)', fontSize: '0.8rem' }}
                      />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleTemplateChange(pitchTemplate)}>
                      Restablecer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
