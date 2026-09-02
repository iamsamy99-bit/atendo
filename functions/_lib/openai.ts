/// <reference types="@cloudflare/workers-types" />

export interface OpenAIPlan {
  intent: 'faq' | 'pricing' | 'booking' | 'qualification' | 'handoff' | 'fallback'
  reply_text: string
  should_handoff: boolean
  needs_live_slots: boolean
  needs_quote: boolean
  // strict:true obliga a que el modelo mande siempre estas claves; cuando no
  // aplica manda null, no las omite.
  lead_updates?: {
    nombre?: string | null
    email?: string | null
    empresa?: string | null
    industria?: string | null
    necesidad?: string | null
    plan_interes?: string | null
    siguiente_accion?: string | null
    estado?: 'nuevo' | 'contactado' | 'calificado' | 'demo_agendada' | 'propuesta_enviada' | 'ganado' | 'perdido' | null
  } | null
  booking_request?: {
    requested_time_text?: string | null
    customer_name?: string | null
    customer_email?: string | null
  } | null
}

interface ResponsesApiResult {
  /** Solo lo expone el SDK oficial; en el JSON crudo NO viene. */
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
  }>
}

/**
 * El endpoint /v1/responses anida el texto en `output[].content[].text` con
 * `type: "output_text"`. `data.output_text` es un atajo que solo arma el SDK,
 * asi que leerlo del JSON crudo daba siempre undefined.
 */
function extractOutputText(data: ResponsesApiResult): string | null {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text
  const chunks: string[] = []
  for (const item of data.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text)
    }
  }
  const joined = chunks.join('').trim()
  return joined || null
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

export async function planWithOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<OpenAIPlan | null> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'whatsapp_plan',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              intent: {
                type: 'string',
                enum: ['faq', 'pricing', 'booking', 'qualification', 'handoff', 'fallback'],
              },
              reply_text: { type: 'string' },
              should_handoff: { type: 'boolean' },
              needs_live_slots: { type: 'boolean' },
              needs_quote: { type: 'boolean' },
              // Structured Outputs con strict:true exige que `required` liste
              // TODAS las propiedades; lo opcional se expresa como union con
              // null. Con `required: []` la API responde 400 y el planner
              // caia siempre al router de keywords.
              lead_updates: {
                type: ['object', 'null'],
                additionalProperties: false,
                properties: {
                  nombre: { type: ['string', 'null'] },
                  email: { type: ['string', 'null'] },
                  empresa: { type: ['string', 'null'] },
                  industria: { type: ['string', 'null'] },
                  necesidad: { type: ['string', 'null'] },
                  plan_interes: { type: ['string', 'null'] },
                  siguiente_accion: { type: ['string', 'null'] },
                  estado: {
                    type: ['string', 'null'],
                    enum: ['nuevo', 'contactado', 'calificado', 'demo_agendada', 'propuesta_enviada', 'ganado', 'perdido', null],
                  },
                },
                required: [
                  'nombre', 'email', 'empresa', 'industria',
                  'necesidad', 'plan_interes', 'siguiente_accion', 'estado',
                ],
              },
              booking_request: {
                type: ['object', 'null'],
                additionalProperties: false,
                properties: {
                  requested_time_text: { type: ['string', 'null'] },
                  customer_name: { type: ['string', 'null'] },
                  customer_email: { type: ['string', 'null'] },
                },
                required: ['requested_time_text', 'customer_name', 'customer_email'],
              },
            },
            required: [
              'intent', 'reply_text', 'should_handoff', 'needs_live_slots',
              'needs_quote', 'lead_updates', 'booking_request',
            ],
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json() as ResponsesApiResult
  const outputText = extractOutputText(data)
  if (!outputText) return null
  const parsed = JSON.parse(extractJson(outputText)) as OpenAIPlan
  return parsed
}
