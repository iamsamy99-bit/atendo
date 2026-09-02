# Prospectos Guadalajara para Atendo

Documento para usar con el agente de prospección de Atendo. El objetivo es investigar negocios de Guadalajara que dependan de llamadas, WhatsApp o agenda de citas, y entregar una lista limpia para importar al panel de `Prospector IA`.

## Objetivo

Encontrar prospectos en Guadalajara, Jalisco, que cumplan con estas condiciones:

- Negocios con alta necesidad de recepción, citas, seguimiento o respuesta rápida.
- Preferencia por:
  - consultorios médicos
  - clínicas dentales
  - dermatólogos
  - ginecólogos
  - pediatras
  - spas
  - clínicas estéticas
  - centros de bienestar
  - psicólogos
  - fisioterapia
- Deben tener al menos un correo público verificable.
- Si no tienen correo público verificable, no incluirlos en la lista para email outreach.

## Criterios de selección

Priorizar negocios que muestren una o varias señales:

- Atienden por cita.
- Tienen teléfono visible.
- Tienen WhatsApp visible.
- Mencionan horarios de atención.
- Muestran fricción operativa típica:
  - "llama para agendar"
  - "escríbenos por WhatsApp"
  - "citas sujetas a disponibilidad"
  - "no atendemos fuera de horario"
- Tienen sitio web, perfil de Google Maps, Doctoralia, Instagram o Facebook activo.

## Exclusiones

No incluir:

- negocios fuera de Guadalajara o su zona urbana inmediata
- directorios sin contacto directo del negocio
- leads sin email público verificable
- leads duplicados por email o teléfono
- hospitales gigantes o cadenas nacionales si no hay contacto local claro
- negocios cerrados, con sitio roto o sin actividad reciente visible

## Geografía objetivo

Buscar primero en:

- Guadalajara
- Providencia
- Chapalita
- Americana
- Ladrón de Guevara
- Lafayette
- Minerva
- Ciudad del Sol
- Zona Real
- Zapopan cercano a Guadalajara

## Fuentes sugeridas

Usar solo información pública y visible:

- sitio web oficial
- página de contacto
- Google Maps / Perfil de Negocio
- Doctoralia
- Instagram bio
- Facebook page
- directorios profesionales con contacto público

## Reglas de verificación

Antes de agregar un lead:

1. Confirmar que el negocio opera en Guadalajara o zona inmediata.
2. Confirmar nombre del negocio.
3. Confirmar correo público visible en sitio, redes o perfil profesional.
4. Confirmar teléfono si existe.
5. Identificar industria específica.
6. Inferir una necesidad comercial concreta de Atendo.

Si el correo no es claro o parece genérico no verificado, descartarlo.

## Formato de salida obligatorio

La salida final debe ser CSV simple, una fila por negocio, con este orden exacto:

```csv
nombre,empresa,telefono,email,industria,necesidad,plan_interes
```

### Reglas por campo

- `nombre`: nombre de la persona de contacto si es público; si no existe, usar `Recepción` o `Equipo comercial`.
- `empresa`: nombre del consultorio, clínica o spa.
- `telefono`: número visible del negocio en formato legible.
- `email`: correo público verificable.
- `industria`: ejemplo `Clínica dental`, `Dermatología`, `Spa`, `Ginecología`, `Medicina general`.
- `necesidad`: una línea concreta, por ejemplo `Pierde llamadas fuera de horario y necesita agendar citas 24/7`.
- `plan_interes`: usar por defecto `Esencial` o `Integral` según el caso.

## Heurística para plan_interes

Usar `Esencial` cuando:

- el negocio es pequeño
- solo se observa necesidad de contestar llamadas o responder dudas
- no hay evidencia de múltiples canales

Usar `Integral` cuando:

- además de llamadas hay WhatsApp, formularios o varios servicios
- se nota necesidad de recepción + seguimiento + web/chat
- es clínica multi-especialidad o spa con varios tratamientos

## Plantillas de necesidad por vertical

Usar frases cortas y concretas:

- Consultorio médico: `Necesita contestar llamadas y agendar consultas sin perder pacientes cuando recepción está ocupada.`
- Clínica dental: `Necesita captar citas nuevas y resolver preguntas de tratamientos y precios 24/7.`
- Dermatología / estética médica: `Necesita responder dudas frecuentes y convertir consultas de valoración en citas.`
- Spa / estética: `Necesita responder WhatsApp y llamadas mientras el equipo atiende en cabina.`
- Psicología: `Necesita tomar primeras consultas y filtrar horarios sin interrumpir sesiones.`
- Fisioterapia: `Necesita confirmar citas y captar pacientes nuevos fuera de horario.`

## Instrucción de calidad

Entregar lotes de 25 a 50 leads limpios por corrida. No mezclar leads sin email con leads listos para campaña de correo.

## Salida adicional recomendada

Además del CSV, entregar una tabla de respaldo con:

- `fuente`
- `url_fuente`
- `fecha_revision`
- `nota_verificacion`

Esa tabla es para auditoría manual y no se importa al panel.

## Prompt sugerido para el agente

```text
Investiga negocios en Guadalajara, Jalisco, que sean buenos prospectos para Atendo: consultorios médicos, clínicas dentales, dermatología, ginecología, pediatría, spas, estética y bienestar.

Solo incluye negocios con email público verificable. Si no hay email visible y verificable, descártalos para esta corrida.

Entrega la salida final en CSV, sin explicación extra, con este orden exacto:
nombre,empresa,telefono,email,industria,necesidad,plan_interes

Reglas:
- Sin duplicados por teléfono o email.
- Prioriza negocios que dependan de citas, recepción, llamadas o WhatsApp.
- Usa "Recepción" o "Equipo comercial" si no hay persona de contacto pública.
- Usa "Esencial" por defecto y "Integral" cuando se vea necesidad multicanal.
- La necesidad debe ser concreta y en una sola línea.
- Solo incluir Guadalajara y zona urbana inmediata.

Después del CSV, agrega una tabla de auditoría con:
empresa | fuente | url_fuente | fecha_revision | nota_verificacion
```

## Uso en Atendo

Pega el CSV resultante en el importador de `Prospector IA`. Tu panel ya acepta este orden:

`nombre, empresa, telefono, email, industria, necesidad, plan_interes`

Después puedes usar las plantillas internas de email para:

- `medica`
- `dental`
- `spa`
- `general`

Si el lote viene limpio, ya queda listo para enviar correos desde `/admin-dashboard/`.
