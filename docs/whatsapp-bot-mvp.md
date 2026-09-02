# WhatsApp Bot MVP

Primera versión del chatbot de WhatsApp para Atendo usando Meta Cloud API.

## Objetivo

Resolver dudas, cotizar con datos reales, calificar prospectos y agendar en tiempo real sin depender de un humano para el primer contacto.

## Endpoint

- Webhook: `/api/whatsapp`
- `GET`: verificación de Meta
- `POST`: recepción de mensajes y statuses

## Configuración requerida

Guardar en `config`:

- `meta_whatsapp_verify_token`
- `meta_whatsapp_access_token`
- `meta_whatsapp_phone_number_id`

Opcional en `bot_configs`:

- `faq_json`
- `pricing_json`
- `discovery_questions_json`
- `system_prompt`

## Flujo actual

1. Meta entrega el mensaje al webhook.
2. Se registra el evento y la conversación en D1.
3. Se crea o liga un lead en CRM.
4. El router responde según intención:
   - FAQ
   - precio/cotización
   - agenda/slots
   - discovery questions
   - fallback
   - handoff si el usuario pide humano
5. Si hay `CALCOM_API_KEY`, la respuesta de agenda usa slots reales.
6. Si hay `OPENAI_API_KEY`, el reply pasa por un planner LLM con salida estructurada.
7. Si hay Meta token configurado, la respuesta sale por WhatsApp.

## Lo siguiente

- Reemplazar el router por un orquestador LLM con tools.
- Crear tool real de `bookSlot` para confirmar citas dentro de Cal.com.
- Guardar respuestas estructuradas de discovery en `leads`.
- Añadir handoff a humano con notificación al equipo.
- Añadir plantillas aprobadas de Meta para follow-ups fuera de la ventana de 24h.
