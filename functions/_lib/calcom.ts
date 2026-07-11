/// <reference types="@cloudflare/workers-types" />
// Disponibilidad real desde Cal.com para que Sofía (Vapi) la diga en la llamada.

const EVENT_TYPE_ID = 6278080 // "30 min meeting" (cal.com/samuel-garcia-gbsw4p/30min)
const TIMEZONE = 'America/Mexico_City' // hora del centro, la de la mayoría de los clientes
const DIAS_VENTANA = 7
const MAX_DIAS = 3
const MAX_HORAS_POR_DIA = 3

export const CALCOM_BOOKING_URL = 'https://cal.com/samuel-garcia-gbsw4p/30min'

interface SlotsResp { data?: Record<string, { start: string }[]> }

function fmtDia(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE })
    .format(new Date(iso))
    .replace(/,/g, '') // "lunes 13 de julio" suena natural en voz; "lunes, 13" no
}

function fmtHora(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TIMEZONE })
    .format(new Date(iso)).replace(/\./g, '').trim()
}

function listar(items: string[]): string {
  if (items.length === 1) return items[0]
  return items.slice(0, -1).join(', ') + ' o ' + items[items.length - 1]
}

/** Frase en español con los próximos huecos reales, lista para que Sofía la diga. */
export async function disponibilidadParaVoz(apiKey: string): Promise<string> {
  const start = new Date()
  const end = new Date(Date.now() + DIAS_VENTANA * 86_400_000)
  const url = `https://api.cal.com/v2/slots?eventTypeId=${EVENT_TYPE_ID}` +
    `&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}` +
    `&timeZone=${encodeURIComponent(TIMEZONE)}`

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-09-04' },
  })
  if (!res.ok) throw new Error(`Cal.com HTTP ${res.status}`)
  const json = await res.json() as SlotsResp
  const porDia = json.data ?? {}

  const dias = Object.keys(porDia).sort().filter(d => (porDia[d] ?? []).length > 0).slice(0, MAX_DIAS)
  if (dias.length === 0) {
    return 'Por el momento no veo horarios disponibles esta semana. Puedo tomar tus datos y te contactamos para coordinar.'
  }

  const frases = dias.map(d => {
    const slots = porDia[d].slice(0, MAX_HORAS_POR_DIA).map(s => fmtHora(s.start))
    return `el ${fmtDia(porDia[d][0].start)} a las ${listar(slots)}`
  })

  return `Tenemos disponibilidad ${listar(frases)}, hora del centro de México. Las demos duran treinta minutos. ¿Cuál te acomoda?`
}
