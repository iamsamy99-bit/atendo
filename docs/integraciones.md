# Integraciones Atendo — guía de decisión (uso interno)

> Para Samuel (operación 1 persona). Objetivo: dar integraciones al plan Empresa **sin gastar tu tiempo en custom por cliente**. La regla de oro: **plantilla una vez, clona por cliente**.

## Capa de automatización — ¿qué conviene?

| Herramienta | Precio 2026 | Cómo cobra | Para ti (solo, MX, muchos clientes similares) |
|---|---|---|---|
| **Make.com** ✅ actual | $9/mes (10k ops), Free = 2 escenarios | por operación | **Tu default hoy.** Ya lo conoces, barato, ideal PYME MX. Sube Free→Core ($9) para quitar el tope de 2 escenarios. |
| **n8n** 🚀 escala | €20/mes (2,500 ejec.) o **self-host ~$6/mes VPS** | por ejecución (workflow entero = 1) | **La jugada al crecer.** 80-90% más barato que Zapier a volumen. White-label. Eres técnico, te sirve. |
| **GoHighLevel** 💰 modelo negocio | $97/mes, sub-cuentas ilimitadas en planes altos | fijo, workflows gratis | **CRM+SMS+email+calendario+pipelines en UNA herramienta resellable.** Si quieres margen recurrente de SaaS por cliente. |
| **Zapier** ⚠️ | $19.99/mes (750 tasks), sube rápido | por task (cada paso) | **Solo como respaldo** para apps que Make/n8n no tengan. Te castiga por task siendo solo. |
| **Vapi webhooks nativos** ✅ | incluido | sin costo por op | Para la acción voz→sistema (ya lo usas). Lo más confiable. |

**Veredicto:**
1. **Ahora:** Make.com Core ($9/mes) + Vapi webhooks. Cero fricción, ya lo dominas.
2. **Al tener 3-5 clientes Empresa:** migra la parte pesada a **n8n self-host** (~$6/mes VPS) — ahorras mucho y lo puedes white-label.
3. **Si quieres vender CRM como parte del plan y cobrar recurrente:** **GoHighLevel** reemplaza CRM+Zapier+calendario+SMS de golpe. Es el más "agencia".
4. **Zapier:** no como base. Solo tapa-huecos.

## Lista de integraciones por categoría

Esfuerzo = tu tiempo de setup por cliente. 🟢 Fácil (<30 min, módulo nativo) · 🟡 Medio · 🔴 Custom/API.

### 📅 Agenda / Calendario
| Integración | Herramienta recomendada | Esfuerzo |
|---|---|---|
| Google Calendar (crear/leer citas) | Make módulo nativo | 🟢 |
| Calendly (ya lo usas) | Make / webhook | 🟢 |
| Cal.com (open-source, white-label) | API / n8n | 🟡 |

### 🗂️ CRM
| Integración | Cuándo usarla | Esfuerzo |
|---|---|---|
| **HubSpot** (CRM gratis) | **Default** para "CRM incluido". API buena, nativo en Make. | 🟢 |
| **Google Sheets / Airtable** | "CRM lite" — muchos clientes solo quieren leads en una tabla. Lo más rápido. | 🟢 |
| **Pipedrive** | Cliente enfocado en ventas/pipeline (popular en LatAm). | 🟡 |
| **GoHighLevel** | Si vendes el CRM tú mismo como parte del plan. | 🟡 |
| **Salesforce** | ⚠️ Solo si el cliente YA lo usa. Pesado, raro en PYME MX. Cotiza tiempo extra. | 🔴 |

### 💬 WhatsApp
| Integración | Nota | Esfuerzo |
|---|---|---|
| Meta WhatsApp Cloud API | Oficial, barato por conversación. El rey en MX. | 🟡 |
| Twilio WhatsApp | Ya tienes Twilio; sender requiere aprobación. | 🟡 |
| 360dialog | Partner WA popular en LatAm, sin markup por mensaje. | 🟡 |

### 📱 SMS
| Twilio SMS (ya lo tienes) | Recordatorios, confirmaciones, follow-up. | 🟢 |

### 📧 Email
| Integración | Uso | Esfuerzo |
|---|---|---|
| Gmail / Google Workspace (ya lo usas) | Notificar leads, avisos. | 🟢 |
| Resend / SendGrid | Emails transaccionales a escala (confirmación de cita, etc.). | 🟡 |

### 🔔 Notificaciones internas
| Telegram (ya lo usas) | Alertas a ti en tiempo real. | 🟢 |
| Slack | Si el cliente trabaja en Slack. | 🟢 |

### 💳 Pagos (opcional, gran valor)
| Stripe | Cobrar anticipo al agendar (reduce no-shows). Vapi/Make → link de pago. | 🟡 |

## Stack estándar recomendado para el plan Empresa

Lo que conviene **prometer y entregar** sin explotar tu tiempo:

- **Agenda:** Google Calendar + Calendly
- **CRM:** HubSpot (gratis) **o** Google Sheets/Airtable según cliente
- **Mensajería:** WhatsApp (Cloud API) + SMS (Twilio) + Email (Gmail/Resend)
- **Pagos (upsell):** Stripe para anticipos
- **Glue:** Make.com (→ n8n al escalar)
- **Voz:** Vapi webhooks nativos

Todo lo demás (Salesforce, integraciones raras) = "a cotizar según alcance" dentro de la implementación a la medida de Empresa. Nunca lo prometas de entrada.

## Principio anti-tiempo (clave siendo 1 persona)

- Construye **1 blueprint de Make/n8n por caso de uso** (captura de lead, agendar cita, recordatorio, cobro de anticipo) y **clónalo** por cliente cambiando credenciales.
- No hagas integraciones custom salvo que el cliente Empresa lo pague como extra.
- Cobra la implementación Empresa según nº de integraciones (ej. 3 incluidas, extra a cotizar).
