// Motor de respuestas simuladas para las demos de chat interactivas
// (hero + tarjeta de la sección "agentes de voz"). Reglas por palabra
// clave, no IA real — por eso el fallback siempre reconduce a un canal
// real (demo / WhatsApp) en vez de intentar sonar inteligente y quedar mal.
export type Lang = 'es' | 'en'

interface Rule {
  test: RegExp
  es: string
  en: string
}

const RULES: Rule[] = [
  {
    test: /\b(hola|buenas|hi|hello|hey|qu[eé] tal)\b/i,
    es: '¡Hola! Soy una demo del agente de Atendo — pregúntame lo que te preguntaría un cliente: precio, horarios, cómo agendar una cita…',
    en: "Hi! I'm a demo of Atendo's agent — ask me what a customer would: price, hours, how to book an appointment…",
  },
  {
    test: /(precio|cuesta|costo|cotiza|cu[aá]nto (sale|vale)|price|cost|how much)/i,
    es: 'Los planes empiezan desde $4,900 MXN al mes y se ajustan a tu volumen de llamadas — en una demo te doy el número exacto para tu negocio.',
    en: "Plans start from $497 USD a month and scale with your call volume — book a demo and I'll give you the exact number for your business.",
  },
  {
    test: /(horario|hora|abren|cierran|24\s?\/?\s?7|disponib|fin de semana|domingo)/i,
    es: 'Contesto 24/7, todos los días del año — llamadas, WhatsApp y el chat del sitio, sin horario de descanso.',
    en: "I answer 24/7, every day of the year — calls, WhatsApp and site chat, no downtime.",
  },
  {
    test: /(cita|agend|reserv|appointment|book|schedule|disponibilidad)/i,
    es: 'Claro, dime qué día y hora te acomoda y te aparto el espacio — o si prefieres, agenda tú mismo la demo con el botón de arriba.',
    en: "Sure — tell me a day and time that works and I'll hold the slot, or book the demo yourself with the button above.",
  },
  {
    test: /(humano|persona real|hablar con alguien|agente real|human|real person)/i,
    es: 'Sin problema, te paso con el equipo — o escríbenos directo por WhatsApp desde el botón flotante.',
    en: "No problem, I'll pass you to the team — or message us directly on WhatsApp from the floating button.",
  },
  {
    test: /(whatsapp)/i,
    es: 'Sí, contesto en WhatsApp igual que aquí, con el mismo contexto de la conversación completo.',
    en: 'Yes, I answer on WhatsApp just like here, with the full conversation context.',
  },
  {
    test: /(env[ií]o|domicilio|delivery|shipping|entrega)/i,
    es: '¡Claro que sí! Compárteme tu zona y te confirmo el tiempo estimado de entrega.',
    en: "Sure! Share your area and I'll confirm the estimated delivery time.",
  },
  {
    test: /(cancela|cancelar|reembolso|contrato forzoso)/i,
    es: 'Cancelas cuando quieras, sin contratos forzosos — mes a mes.',
    en: 'Cancel anytime, no forced contracts — month to month.',
  },
  {
    test: /(gracias|thanks|thank you)/i,
    es: 'Con gusto. ¿Algo más en lo que te ayude?',
    en: "You're welcome. Anything else I can help with?",
  },
  {
    test: /(adi[oó]s|bye|goodbye|hasta luego|nos vemos)/i,
    es: '¡Hasta pronto! Aquí sigo cuando quieras.',
    en: "See you soon! I'm here whenever you need.",
  },
]

const FALLBACK: Record<Lang, string> = {
  es: 'Buena pregunta — en una llamada real reviso la información de tu negocio y contesto con eso. Aquí soy solo una demo; pide una real con el botón de arriba. 👆',
  en: "Good question — on a real call I'd check your business info and answer with that. Here I'm just a demo; ask for a real one with the button above. 👆",
}

export function getReply(text: string, lang: Lang): string {
  const match = RULES.find((rule) => rule.test.test(text))
  return match ? match[lang] : FALLBACK[lang]
}

export function currentLang(): Lang {
  return document.documentElement.lang === 'en' ? 'en' : 'es'
}
