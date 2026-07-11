// Catálogo de plantillas de correo (estilo Salesforce Lightning) + beneficios
// que se adaptan al interés de cada lead. Fuente única: la usan el endpoint de
// plantillas, la vista previa y el envío.

export interface Plantilla {
  id: string
  nombre: string
  categoria: string
  asunto: string
  cuerpo: string
  ctaLabel: string
  ctaUrl: string
}

// Página de agendado real (Cal.com); el Calendly viejo tenía el horario mal configurado.
const CALENDLY = 'https://cal.com/samuel-garcia-gbsw4p/30min'

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'seguimiento-general',
    nombre: 'Seguimiento general (cálido)',
    categoria: 'General',
    asunto: '{primer_nombre}, ¿seguimos con lo de {plan}?',
    cuerpo: `Hola {primer_nombre},

Gracias por tu interés en Atendo para {empresa}. Quería retomar la conversación y ver si te quedó alguna duda.

Esto es lo que Atendo puede hacer por {empresa}:
{beneficios}

¿Te late una llamada de 15 minutos esta semana para verlo aplicado a tu caso?`,
    ctaLabel: 'Agendar una llamada',
    ctaUrl: CALENDLY,
  },
  {
    id: 'interes-voz',
    nombre: 'Interés en agente de voz',
    categoria: 'Voz / llamadas',
    asunto: '{primer_nombre}, que {empresa} no pierda otra llamada',
    cuerpo: `Hola {primer_nombre},

Sé que en {industria} cada llamada cuenta. Sofía, el agente de voz de Atendo, contesta por {empresa} las 24 horas, con voz natural y sin tiempos de espera.

Lo que resuelve desde el primer día:
{beneficios}

¿Te gustaría escucharla en vivo? Te muestro cómo sonaría con el guion de {empresa}.`,
    ctaLabel: 'Escuchar una demo',
    ctaUrl: CALENDLY,
  },
  {
    id: 'interes-chat',
    nombre: 'Interés en chat / WhatsApp',
    categoria: 'Chat / WhatsApp',
    asunto: '{primer_nombre}, respuestas al instante para {empresa}',
    cuerpo: `Hola {primer_nombre},

Tus clientes escriben a cualquier hora — y una respuesta rápida es la diferencia entre ganar o perder la venta. El chat con IA de Atendo responde por {empresa} al instante, en WhatsApp y en tu sitio.

Lo que obtienes:
{beneficios}

¿Te muestro cómo quedaría configurado para {empresa}?`,
    ctaLabel: 'Ver una demo',
    ctaUrl: CALENDLY,
  },
  {
    id: 'recordatorio-propuesta',
    nombre: 'Recordatorio de propuesta',
    categoria: 'Propuesta enviada',
    asunto: '{primer_nombre}, ¿pudiste revisar la propuesta?',
    cuerpo: `Hola {primer_nombre},

Quería confirmar que te llegó la propuesta para {empresa} y saber si tienes alguna duda o comentario.

Como recordatorio, esto es lo que incluye:
{beneficios}

Si te parece, podemos ajustarla juntos en una llamada corta y dejarla lista.`,
    ctaLabel: 'Resolver dudas',
    ctaUrl: CALENDLY,
  },
  {
    id: 'reactivacion',
    nombre: 'Reactivar lead frío',
    categoria: 'Reactivación',
    asunto: '{primer_nombre}, ¿lo retomamos?',
    cuerpo: `Hola {primer_nombre},

Hace un tiempo platicamos sobre cómo Atendo podía ayudar a {empresa} y no quise dejarlo ahí.

Por si te sirve recordarlo, esto es lo que hacemos:
{beneficios}

Si sigue siendo relevante, con gusto retomamos donde lo dejamos. Y si ya no, dime y no te escribo más.`,
    ctaLabel: 'Retomar la conversación',
    ctaUrl: CALENDLY,
  },
]

/** Bullets de beneficios adaptados a lo que le interesó al lead. */
export function beneficiosPara(campos: { plan_interes?: string | null; necesidad?: string | null; canal?: string | null }): string[] {
  const t = `${campos.plan_interes ?? ''} ${campos.necesidad ?? ''} ${campos.canal ?? ''}`.toLowerCase()
  const es = (re: RegExp) => re.test(t)

  if (es(/voz|llamad|telefon|recepcion|call/)) return [
    'Contesta todas las llamadas 24/7, incluso fuera de horario y en días festivos.',
    'Agenda citas y toma datos del cliente sin que tú levantes el teléfono.',
    'Voz natural en español; tus clientes sienten que hablan con una persona.',
  ]
  if (es(/chat|whatsapp|mensaj|wa\b/)) return [
    'Responde en WhatsApp y en tu sitio al instante, a cualquier hora.',
    'Resuelve las preguntas frecuentes y pasa a un humano solo cuando hace falta.',
    'Captura al prospecto y lo registra automáticamente para darle seguimiento.',
  ]
  if (es(/web|sitio|p[aá]gina|landing/)) return [
    'Sitio web profesional listo para convertir visitas en clientes.',
    'Integrado con el agente de voz y el chat desde el primer día.',
    'Optimizado para celular y para aparecer en Google.',
  ]
  if (es(/bundle|paquete|todo|completo|integral/)) return [
    'Voz, chat y sitio web trabajando juntos como un solo sistema.',
    'Un solo lugar para ver llamadas, mensajes y prospectos.',
    'Implementación acompañada, sin que tú tengas que configurar nada.',
  ]
  // Genérico: resumen de la propuesta de valor.
  return [
    'Agentes de voz y chat con IA que atienden a tus clientes 24/7.',
    'Captura y seguimiento automático de cada prospecto.',
    'Configuración a la medida de tu negocio, sin complicaciones técnicas.',
  ]
}
