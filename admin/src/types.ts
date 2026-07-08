export type LeadEstado = 'nuevo' | 'contactado' | 'calificado' | 'demo_agendada' | 'propuesta_enviada' | 'ganado' | 'perdido'
export type LeadCanal = 'calendly' | 'telefono' | 'whatsapp' | 'crisp' | 'pricing' | 'referido' | 'otro'

export interface Lead {
  id: number
  created_at: string
  updated_at: string
  canal: LeadCanal
  origen: string | null
  nombre: string
  telefono: string | null
  email: string | null
  empresa: string | null
  industria: string | null
  necesidad: string | null
  volumen_estimado: string | null
  plan_interes: string | null
  idioma: string
  siguiente_accion: string | null
  estado: LeadEstado
  motivo_perdida: string | null
  notas: string | null
  cliente_id: number | null
}

export interface Cliente {
  id: number
  created_at: string
  nombre: string
  negocio: string | null
  industria: string | null
  email: string | null
  telefono: string | null
  plan: string | null
  mensualidad: number
  estado: 'activo' | 'pausado' | 'cancelado'
  fecha_inicio: string | null
  notas: string | null
}

export interface Pago {
  id: number
  created_at: string
  cliente_id: number
  monto: number
  moneda: string
  fecha: string
  metodo: 'transferencia' | 'tarjeta' | 'efectivo' | 'otro'
  concepto: string | null
  notas: string | null
}

export interface Ticket {
  id: number
  created_at: string
  cliente_id: number | null
  titulo: string
  descripcion: string | null
  estado: 'abierto' | 'en_curso' | 'resuelto'
  prioridad: 'baja' | 'media' | 'alta'
  resuelto_at: string | null
  notas: string | null
}

export interface Metrics {
  clientes_activos: number
  ingresos_mes: number
  leads_abiertos: number
  tickets_abiertos: number
  pipeline: { estado: LeadEstado; n: number }[]
  pagos_por_mes: { mes: string; total: number }[]
}

export const LEAD_ESTADOS: { key: LeadEstado; label: string }[] = [
  { key: 'nuevo', label: 'Nuevo' },
  { key: 'contactado', label: 'Contactado' },
  { key: 'calificado', label: 'Calificado' },
  { key: 'demo_agendada', label: 'Demo agendada' },
  { key: 'propuesta_enviada', label: 'Propuesta enviada' },
  { key: 'ganado', label: 'Ganado' },
  { key: 'perdido', label: 'Perdido' },
]

export const LEAD_CANALES: { key: LeadCanal; label: string }[] = [
  { key: 'telefono', label: 'Teléfono (Sofía)' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'calendly', label: 'Calendly' },
  { key: 'crisp', label: 'Chat (Crisp)' },
  { key: 'pricing', label: 'Planes' },
  { key: 'referido', label: 'Referido' },
  { key: 'otro', label: 'Otro' },
]

export function fmtMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

export function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
