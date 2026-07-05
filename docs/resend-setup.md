# Resend — correos automáticos desde @atendo.lat

Resend envía los correos **transaccionales/automáticos** (confirmaciones, seguimientos de leads desde Make). Convive sin conflicto con Cloudflare Email Routing (que solo **recibe**): Resend usa un subdominio propio para el envío, así que los MX del dominio raíz no se tocan.

Plan free: 3,000 correos/mes, 100/día — de sobra para empezar.

## 1. Alta (5 min, manual)

1. Crear cuenta en https://resend.com (con sg8258563@gmail.com o la de empresa).
2. **Domains → Add Domain** → `atendo.lat` → región `us-east-1` está bien.
3. Resend mostrará 3-4 registros DNS. Agregarlos en Cloudflare (dash → atendo.lat → DNS → Records), típicamente:
   - `MX`  `send.atendo.lat` → `feedback-smtp.us-east-1.amazonses.com` (prioridad 10) — **proxy OFF (gris)**
   - `TXT` `send.atendo.lat` → `v=spf1 include:amazonses.com ~all`
   - `TXT` `resend._domainkey.atendo.lat` → `p=MIGfMA0...` (la clave DKIM que te dé Resend)
   > Todos los registros de correo van **sin proxy** (nube gris). No tocar los MX de `atendo.lat` raíz (son de Email Routing y están bloqueados).
4. Botón **Verify DNS Records** en Resend (tarda minutos).
5. **API Keys → Create API Key** (permiso "Sending access") → guardarla en `.env.local` como `RESEND_API_KEY=re_...` (NUNCA al repo).

**Recomendado además (mejora entregabilidad de TODO el correo del dominio):** agregar DMARC en Cloudflare:
- `TXT` `_dmarc.atendo.lat` → `v=DMARC1; p=none; rua=mailto:hola@atendo.lat`

## 2. Probar el envío

```bash
source .env.local
curl -s https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Atendo <hola@atendo.lat>",
    "to": ["sg8258563@gmail.com"],
    "subject": "Prueba Resend + atendo.lat",
    "html": "<p>Funciona 🎉</p>"
  }'
```

## 3. Conectar con Make.com (correos automáticos a leads)

El escenario existente (`Vapi Sofía — Lead al cerrar llamada`, Router de 3 rutas) puede mandar correo al lead en la ruta `end-of-call-report`:

1. En la ruta 1 del Router, después del email/Telegram a Samuel, agregar módulo **HTTP → Make a request**:
   - URL: `https://api.resend.com/emails`
   - Method: `POST`
   - Headers: `Authorization: Bearer re_...` y `Content-Type: application/json`
   - Body (JSON): usar el HTML de abajo con los campos del lead mapeados (`{{name}}`, `{{email}}` del tool call `captureLeadInfo`)
2. Condición del filtro: que exista `email` del lead (Sofía no siempre lo captura).

> Make también tiene app nativa "Resend" — si aparece en el plan free, usarla en vez del HTTP module (mismos campos).

Casos de uso siguientes: confirmación automática al agendar demo (`agendarDemo`), correo de seguimiento 24 h después de la llamada (escenario con Sleep/Schedule — ojo con el límite de 2 escenarios del plan free de Make).

## 4. Template HTML base (marca Atendo)

Guardado en `docs/email-templates/atendo-base.html`. Diseño oscuro del sitio, con CSS inline (compatible con Gmail/Outlook). Variables a reemplazar: `{{SUBJECT}}`, `{{HEADLINE}}`, `{{BODY_HTML}}`, `{{CTA_URL}}`, `{{CTA_TEXT}}`.

Los 5 templates de texto para uso manual en Gmail están en `docs/email-templates.md`.
