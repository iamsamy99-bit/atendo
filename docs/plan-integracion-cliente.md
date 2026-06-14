# Plan de integración para un cliente nuevo

> Cómo pasar de "cliente firmado" a "agente funcionando", paso a paso.

## Fase 0 — Antes de empezar (venta cerrada)
- [ ] Cliente agenda demo por Calendly y acepta propuesta.
- [ ] Firma de Términos y Aviso de Privacidad (consentimiento de grabación incluido).
- [ ] Cobro de setup + primer mes (Stripe USD para US / Stripe o SPEI MXN para México).

## Fase 1 — Descubrimiento (1 llamada, 30–45 min)
Recolectar:
- [ ] Giro del negocio y horario de atención.
- [ ] Las 10–20 preguntas más comunes de sus clientes.
- [ ] Qué debe HACER el agente: ¿informar? ¿agendar cita? ¿tomar pedido? ¿transferir a humano?
- [ ] A qué número/calendario se conecta y a quién transfiere si lo piden.
- [ ] Idioma(s): español, inglés o ambos.

## Fase 2 — Configuración del agente (en Vapi)
- [ ] Crear assistant en Vapi.
- [ ] Redactar el **system prompt** con tono, datos del negocio y reglas.
- [ ] Cargar **knowledge base** (preguntas frecuentes, precios, políticas del cliente).
- [ ] Elegir **voz** (español mexicano / inglés) en ElevenLabs/plataforma.
- [ ] Conectar **acciones**: agendar en Google Calendar / Calendly, enviar SMS/WhatsApp, transferir llamada.
- [ ] Definir **mensaje de bienvenida** y **frase de cierre**.

## Fase 3 — Telefonía
- **EE.UU.:** comprar número local en Vapi/Twilio y asignarlo al assistant.
- **México:** configurar **desvío del número del cliente** hacia el número/SIP del agente
  (o número propio si ya está el bundle IFT).
- [ ] Probar llamada entrante real.
- [ ] Configurar horario: agente 24/7 o solo fuera de horario.

## Fase 4 — Pruebas (QA)
- [ ] 5–10 llamadas de prueba cubriendo los casos comunes.
- [ ] Verificar que agenda citas correctamente.
- [ ] Verificar transferencia a humano.
- [ ] Revisar transcripciones y corregir el prompt.
- [ ] Probar el "no entendí" (¿qué hace cuando no sabe?).

## Fase 5 — Lanzamiento
- [ ] Activar el desvío/numero en producción.
- [ ] Avisar al cliente que ya está en vivo.
- [ ] Enviar al cliente el documento de Ayuda (docs/ayuda-cliente.md).

## Fase 6 — Operación y soporte
- [ ] Reporte semanal/mensual: # llamadas, # citas agendadas, minutos usados.
- [ ] Monitorear minutos vs plan (cobrar excedente si aplica).
- [ ] Ajustes de prompt según feedback.
- [ ] Renovación mensual automática (Stripe).

## Tiempos estimados
- Negocio simple: **2–4 días** desde la llamada de descubrimiento.
- Negocio con integraciones (CRM, agenda compleja): **1–2 semanas**.
