# Proveedores para agentes de voz con IA — México y EE.UU.

> Documento de referencia para Atendo. Última actualización: 2026-06-14.

## Cómo funciona el stack (3 capas)

Un agente telefónico se arma eligiendo un proveedor en cada capa:

1. **Plataforma del agente** (el "cerebro" que orquesta la conversación).
2. **Telefonía / VoIP** (el número y la llamada).
3. **Voz / idioma** (cómo suena y cómo entiende).

Muchas plataformas integran las 3 capas, así no contratas todo por separado.

---

## 1) Plataforma del agente de voz

| Plataforma | Para quién | Notas |
|---|---|---|
| **Vapi** ⭐ | Recomendada para arrancar | Telefonía integrada (Twilio/Telnyx), buena en español, API potente, pago por minuto |
| **Retell AI** | Alternativa sólida | Latencia baja, fácil de configurar |
| **Bland AI** | Volumen / outbound | Todo-en-uno, ideal para campañas de llamadas salientes |
| **Synthflow** | No-code | Visual, menos técnico (clientes simples) |

## 2) Telefonía / VoIP

### 🇺🇸 Estados Unidos
- **Trivial.** Número local en minutos con **Twilio** o **Telnyx** (ya vienen dentro de Vapi/Retell).
- Sin trámites. Es donde está el mayor margen.

### 🇲🇽 México
- **Sí se puede**, con un detalle regulatorio.
- Para un **número local mexicano**, los carriers (Twilio, Telnyx, Plivo, Zadarma) piden un
  **"regulatory bundle" del IFT**: comprobante de domicilio en México + datos fiscales (RFC).
  Es papeleo de una sola vez, no un bloqueo.

**🔑 Truco para arrancar en México sin trámite:**
No provisiones número nuevo. Usa el **número que el cliente YA tiene** y configura
**desvío de llamadas (call forwarding)** hacia un endpoint SIP / número de Twilio US.
El agente contesta igual, el cliente conserva su número, y evitas el registro regulatorio.

## 3) Voz / idioma

- **ElevenLabs** — voces en **español mexicano** muy naturales (también lo maneja Vapi/Retell por dentro).
- **Deepgram** — speech-to-text en español.
- Conclusión: un agente que suene 100% mexicano **sí es posible hoy**.

---

## Recomendación de arranque

- **Una sola plataforma: Vapi** (cubre cerebro + telefonía + voz).
- **EE.UU.:** números directos, vende ya.
- **México:** empieza con **desvío del número del cliente**; cuando haya volumen, tramita el bundle del IFT.
- **Costo real:** ~$0.05–0.15 USD/min todo incluido → cobras $0.15–0.35 USD/min (o lo incluyes en la mensualidad).

## Cuentas a crear (checklist)

- [ ] Vapi (vapi.ai)
- [ ] Twilio (telefonía/respaldo)
- [ ] ElevenLabs (voces) — opcional si usas las de la plataforma
- [ ] (México, fase 2) Iniciar regulatory bundle IFT en Twilio/Telnyx
