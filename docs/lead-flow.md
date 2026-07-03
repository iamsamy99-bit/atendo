# Flujo minimo de leads

Este flujo es la fuente de verdad antes de automatizar con Make, Vapi o cualquier CRM. La automatizacion debe copiar este proceso, no reemplazarlo.

## Canales de entrada

| Canal | Origen sugerido | Datos esperados | Etiquetas |
| --- | --- | --- | --- |
| Calendly | `calendar-inline`, `cta-calendly` | nombre, email, fecha/hora, notas | `landing`, `voice-demo` |
| Telefono Sofia | `hero-phone`, `nav-phone`, `floating-phone` | telefono, resumen de llamada, intencion | `landing`, `voice-demo` |
| WhatsApp | `calendar-fallback`, `footer` | telefono, mensaje inicial, idioma | `landing`, `whatsapp` |
| Crisp | `calendar-fallback` | email/telefono si lo deja, conversacion | `landing`, `chat` |
| Planes | `pricing-plan` | plan consultado | `landing`, `pricing-plan` |

## Campos minimos

- Fecha de entrada.
- Canal y origen.
- Nombre del contacto.
- Telefono y/o email.
- Empresa o tipo de negocio.
- Industria.
- Necesidad principal: llamadas, WhatsApp/chat, sitio web o paquete.
- Volumen estimado: llamadas o conversaciones por mes.
- Plan de interes, si existe.
- Idioma preferido.
- Siguiente accion.
- Estado.
- Responsable.

## Estados

| Estado | Definicion | Siguiente accion |
| --- | --- | --- |
| Nuevo | Entro por algun canal y aun no se revisa. | Responder en menos de 1 hora habil. |
| Contactado | Ya hubo respuesta inicial. | Confirmar necesidad y presupuesto. |
| Calificado | Tiene negocio real, dolor claro y datos suficientes. | Agendar demo o enviar propuesta. |
| Demo agendada | Tiene fecha en Calendly o confirmada por chat. | Preparar demo con industria y caso de uso. |
| Propuesta enviada | Ya recibio precio/alcance. | Seguimiento a 24-48 horas. |
| Ganado | Acepto iniciar. | Enviar onboarding y solicitud de informacion. |
| Perdido | No hay fit, presupuesto o respuesta. | Registrar motivo. |

## Reglas operativas

- No pedir la misma informacion dos veces si ya esta en Calendly, Crisp o la llamada.
- Si Calendly falla, WhatsApp es el respaldo principal y Crisp el secundario.
- Si el lead llama a Sofia, capturar telefono, industria, urgencia y permiso para seguimiento.
- Si pregunta por un plan, guardar el `data-plan` como plan de interes.
- No guardar API keys, tokens ni datos sensibles en notas del lead.
- Automatizar Make/Vapi solo cuando estos campos y estados esten funcionando manualmente.
