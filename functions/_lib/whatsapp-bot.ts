/// <reference types="@cloudflare/workers-types" />
import { CALCOM_BOOKING_URL, disponibilidadParaVoz } from './calcom'
import { planWithOpenAI } from './openai'

export interface BotConfig {
  businessName: string
  assistantName: string
  tone: string
  timezone: string
  bookingUrl: string
  contactEmail: string | null
  systemPrompt: string | null
  faq: Record<string, string>
  pricing: {
    base_currency?: string
    plans?: Array<{ code?: string; name?: string; price_from?: number; billing?: string; notes?: string }>
  }
  discoveryQuestions: string[]
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface BotReply {
  text: string
  intent: 'faq' | 'pricing' | 'booking' | 'qualification' | 'fallback'
  quoteJson?: string
  handoff?: boolean
  leadUpdates?: {
    nombre?: string
    email?: string
    empresa?: string
    industria?: string
    necesidad?: string
    plan_interes?: string
    siguiente_accion?: string
    estado?: 'nuevo' | 'contactado' | 'calificado' | 'demo_agendada' | 'propuesta_enviada' | 'ganado' | 'perdido'
  }
  bookingRequest?: {
    requestedTimeText?: string
    customerName?: string
    customerEmail?: string
  }
}

/** Quita las claves en null que manda Structured Outputs con strict:true. */
function nullsToUndefined<T extends Record<string, unknown>>(obj: T): { [K in keyof T]?: NonNullable<T[K]> } {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) out[key] = value
  }
  return out as { [K in keyof T]?: NonNullable<T[K]> }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term))
}

function currency(amount: number, code = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount)
}

function buildPricingReply(config: BotConfig): BotReply {
  const plans = config.pricing.plans ?? []
  if (plans.length === 0) {
    return {
      intent: 'pricing',
      text: `Sí te puedo orientar con precios. Para cotizarte bien, necesito entender volumen, tipo de flujo y si solo quieres responder dudas o también agendar y dar seguimiento.`,
    }
  }
  const currencyCode = config.pricing.base_currency ?? 'MXN'
  const summary = plans
    .map(plan => `${plan.name ?? plan.code ?? 'Plan'} desde ${currency(plan.price_from ?? 0, currencyCode)} ${plan.billing ?? 'mensuales'}`)
    .join('. ')
  return {
    intent: 'pricing',
    text: `Claro. Hoy manejamos esto de forma referencial: ${summary}. Si quieres, te hago una cotización más precisa según tu volumen, horarios y nivel de personalización.`,
    quoteJson: JSON.stringify({ currency: currencyCode, plans }),
  }
}

function quoteSummary(config: BotConfig): string {
  const plans = config.pricing.plans ?? []
  if (plans.length === 0) return ''
  const currencyCode = config.pricing.base_currency ?? 'MXN'
  return plans
    .map(plan => `${plan.name ?? plan.code ?? 'Plan'}: ${currency(plan.price_from ?? 0, currencyCode)} ${plan.billing ?? 'mensuales'}`)
    .join(' · ')
}

function buildQualificationReply(config: BotConfig): BotReply {
  const qs = config.discoveryQuestions.slice(0, 3)
  return {
    intent: 'qualification',
    text: `Perfecto. Para orientarte bien necesito tres datos: ${qs.map((q, i) => `${i + 1}) ${q}`).join(' ')}`,
  }
}

function buildFaqReply(config: BotConfig, text: string): BotReply | null {
  const t = normalize(text)
  if (includesAny(t, ['horario', 'horarios', 'atienden'])) {
    return { intent: 'faq', text: config.faq.horarios ?? 'Te ayudo con horarios y disponibilidad en tiempo real.' }
  }
  if (includesAny(t, ['idioma', 'idiomas', 'ingles', 'english'])) {
    return { intent: 'faq', text: config.faq.idiomas ?? 'Atendemos en español e inglés.' }
  }
  if (includesAny(t, ['que hacen', 'como funciona', 'producto', 'servicio'])) {
    return { intent: 'faq', text: config.faq.producto ?? `${config.businessName} automatiza atención, cotización y agenda con agentes de IA.` }
  }
  return null
}

function buildSystemPrompt(config: BotConfig): string {
  return [
    config.systemPrompt ?? `Eres ${config.assistantName}, asesora comercial de ${config.businessName}.`,
    'Escribes por WhatsApp como una persona real: profesional, clara, breve y humana.',
    'No digas que eres IA salvo que te lo pregunten directamente.',
    'Responde en el idioma del usuario. Mantén cada mensaje en 2 a 4 lineas naturales.',
    'Puedes responder FAQs, orientar precios, calificar prospectos y mover la conversación a agenda.',
    'Si el usuario pide hablar con alguien, marca should_handoff=true.',
    'Si comparte nombre, correo, empresa, necesidad o plan de interes, extráelos en lead_updates.',
    'Si propone un horario o quiere apartar cita, llena booking_request con lo que haya disponible sin inventar datos.',
    'No inventes descuentos, capacidades ni fechas confirmadas.',
  ].join('\n')
}

function buildUserPrompt(text: string, config: BotConfig, history: ConversationTurn[]): string {
  const historyText = history.slice(-8).map(turn => `${turn.role === 'user' ? 'Cliente' : config.assistantName}: ${turn.text}`).join('\n')
  return [
    `Mensaje actual del cliente: ${text}`,
    historyText ? `Historial reciente:\n${historyText}` : 'Historial reciente: (vacío)',
    `FAQ conocidas: ${JSON.stringify(config.faq)}`,
    `Precios base: ${JSON.stringify(config.pricing)}`,
    `Preguntas de discovery: ${JSON.stringify(config.discoveryQuestions)}`,
    'Devuelve solo JSON valido conforme al esquema.',
  ].join('\n\n')
}

async function composeReplyWithAI(
  text: string,
  config: BotConfig,
  history: ConversationTurn[],
  calcomApiKey: string | undefined,
  openAiApiKey: string,
  openAiModel: string
): Promise<BotReply | null> {
  try {
    const plan = await planWithOpenAI(
      openAiApiKey,
      openAiModel,
      buildSystemPrompt(config),
      buildUserPrompt(text, config, history)
    )
    if (!plan) return null

    let replyText = plan.reply_text.trim()
    let quoteJson: string | undefined
    if (plan.needs_quote) {
      const quote = quoteSummary(config)
      if (quote) {
        quoteJson = JSON.stringify(config.pricing)
        if (!normalize(replyText).includes('mxn') && !normalize(replyText).includes('usd')) {
          replyText = `${replyText}\n\nReferencia rápida: ${quote}.`
        }
      }
    }

    if (plan.needs_live_slots) {
      if (calcomApiKey) {
        try {
          const slots = await disponibilidadParaVoz(calcomApiKey)
          if (!normalize(replyText).includes('disponibilidad')) replyText = `${replyText}\n\n${slots}`
        } catch {
          replyText = `${replyText}\n\nSi quieres, te comparto el link directo para reservar: ${config.bookingUrl || CALCOM_BOOKING_URL}`
        }
      } else {
        replyText = `${replyText}\n\nEn cuanto quede activo el calendario en vivo, también te paso horarios exactos. Mientras tanto puedes reservar aquí: ${config.bookingUrl || CALCOM_BOOKING_URL}`
      }
    }

    return {
      text: replyText,
      intent: plan.intent === 'handoff' ? 'fallback' : plan.intent,
      quoteJson,
      handoff: plan.should_handoff,
      // strict:true hace que el modelo mande null en vez de omitir la clave;
      // el resto del código espera undefined.
      leadUpdates: plan.lead_updates ? nullsToUndefined(plan.lead_updates) : undefined,
      bookingRequest: plan.booking_request
        ? {
            requestedTimeText: plan.booking_request.requested_time_text ?? undefined,
            customerName: plan.booking_request.customer_name ?? undefined,
            customerEmail: plan.booking_request.customer_email ?? undefined,
          }
        : undefined,
    }
  } catch (err) {
    // Sin este log, un fallo del planner (schema invalido, API caida, 429)
    // era invisible: el bot seguia respondiendo con el router de keywords y
    // nada indicaba que la ruta con IA estaba muerta.
    console.error('[whatsapp-bot] planner OpenAI fallo, usando router de keywords:', err)
    return null
  }
}

export async function composeReply(
  text: string,
  config: BotConfig,
  history: ConversationTurn[],
  calcomApiKey?: string,
  openAiApiKey?: string,
  openAiModel = 'gpt-4o-mini'
): Promise<BotReply> {
  if (openAiApiKey) {
    const aiReply = await composeReplyWithAI(text, config, history, calcomApiKey, openAiApiKey, openAiModel)
    if (aiReply) return aiReply
  }

  const normalized = normalize(text)
  const faq = buildFaqReply(config, text)
  if (faq) return faq

  if (includesAny(normalized, ['precio', 'precios', 'cuanto cuesta', 'cotiza', 'cotizacion', 'cotizar'])) {
    return buildPricingReply(config)
  }

  if (includesAny(normalized, ['agenda', 'agendar', 'cita', 'demo', 'reunion', 'llamada'])) {
    if (!calcomApiKey) {
      return {
        intent: 'booking',
        text: `Te ayudo a agendar. En este momento no pude consultar slots en vivo, pero puedes tomar la cita aquí: ${config.bookingUrl || CALCOM_BOOKING_URL}`,
      }
    }
    try {
      const dispo = await disponibilidadParaVoz(calcomApiKey)
      return {
        intent: 'booking',
        text: `${dispo} Si prefieres, también te dejo el link directo: ${config.bookingUrl || CALCOM_BOOKING_URL}`,
      }
    } catch {
      return {
        intent: 'booking',
        text: `Te ayudo a agendar. No pude leer la agenda en este instante, pero puedes reservar aquí: ${config.bookingUrl || CALCOM_BOOKING_URL}`,
      }
    }
  }

  const askedQualification = history.slice(-4).some(turn =>
    turn.role === 'assistant' && normalize(turn.text).includes('para orientarte bien necesito tres datos')
  )
  if (!askedQualification && includesAny(normalized, ['quiero informacion', 'me interesa', 'informes', 'info'])) {
    return buildQualificationReply(config)
  }

  return {
    intent: 'fallback',
    text: `Claro. Te ayudo con eso. Si quieres avanzar rápido, te puedo cotizar, resolver dudas puntuales o revisar horarios disponibles para una llamada. ¿Qué te interesa primero?`,
  }
}

export function defaultBotConfig(row?: Partial<BotConfig>): BotConfig {
  return {
    businessName: row?.businessName ?? 'Atendo',
    assistantName: row?.assistantName ?? 'Sofia',
    tone: row?.tone ?? 'profesional, claro y humano',
    timezone: row?.timezone ?? 'America/Mexico_City',
    bookingUrl: row?.bookingUrl ?? CALCOM_BOOKING_URL,
    contactEmail: row?.contactEmail ?? 'hola@atendo.lat',
    systemPrompt: row?.systemPrompt ?? null,
    faq: row?.faq ?? {},
    pricing: row?.pricing ?? {},
    discoveryQuestions: row?.discoveryQuestions ?? [
      'Cuantas conversaciones o citas manejan por semana?',
      'Que quieren que el bot haga exactamente?',
      'Hoy usan algun calendario o CRM?',
    ],
  }
}
