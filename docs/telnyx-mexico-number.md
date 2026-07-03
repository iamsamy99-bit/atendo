# Número mexicano (Telnyx) → VAPI Sofía

> Guía para comprar un número con lada de México en Telnyx y conectarlo al agente Sofía de VAPI.
> La API key de Telnyx está en `.env.local` (variable `TELNYX_API_KEY`). NUNCA se sube al repo.

---

## Contexto actual

- VAPI Sofía ya tiene un número de EE.UU.: `+1 669 268 0598` (provider `vapi`).
- El sitio muestra ese número (nav, hero y botón flotante "Llamar a Sofía").
- Cuando se compre el número mexicano, hay que: (1) comprarlo en Telnyx, (2) conectarlo a VAPI, (3) actualizar el sitio.

---

## Paso 1 — Comprar el número en Telnyx

> ⚠️ Importante: los números de México (lada 55 CDMX, 33 Guadalajara, etc.) requieren
> documentación regulatoria (comprobante de domicilio, identificación / RFC) y la
> aprobación puede tardar varios días hábiles. Empieza el trámite con anticipación.

**Opción dashboard (recomendado para el trámite regulatorio):**
1. portal.telnyx.com → Numbers → Search & Buy Numbers
2. País: Mexico. Filtra por lada (55 / 33). Compra el número.
3. Sube los documentos regulatorios (Telnyx te los pedirá para activar números MX).
4. Numbers → My Numbers → asegúrate de que el número quede **Active**.

**Buscar números disponibles vía API (verificación rápida):**
```bash
source .env.local
curl -s "https://api.telnyx.com/v2/available_phone_numbers?filter\[country_code\]=MX&filter\[national_destination_code\]=55" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | python3 -m json.tool | head -40
```

---

## Paso 2 — Conectar el número de Telnyx a VAPI

VAPI puede importar un número de Telnyx usando una credencial con la API key.

### 2a. Crear la credencial de Telnyx en VAPI
```bash
source .env.local
curl -s -X POST https://api.vapi.ai/credential \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"telnyx\",
    \"apiKey\": \"$TELNYX_API_KEY\"
  }"
# Guarda el "id" que devuelve → es el credentialId
```

### 2b. Importar el número y asignarlo a Sofía
```bash
source .env.local
curl -s -X POST https://api.vapi.ai/phone-number \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"telnyx\",
    \"number\": \"+52XXXXXXXXXX\",
    \"credentialId\": \"<ID_DEL_PASO_2A>\",
    \"assistantId\": \"$VAPI_ASSISTANT_ID\"
  }"
```

> Si VAPI no soporta importación nativa de Telnyx para MX, la alternativa es un
> **SIP trunk (BYO)**: en Telnyx crear un "Voice API / SIP Connection", apuntar el
> número a VAPI vía SIP, y en VAPI registrar un `byo-phone-number` con esa credencial SIP.
> Telnyx → Voice → SIP Connections. VAPI → Phone Numbers → Import → SIP/BYO.

### 2c. Verificar que quedó asignado
```bash
source .env.local
curl -s https://api.vapi.ai/phone-number \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" | python3 -m json.tool
```

---

## Paso 3 — Mostrar el número mexicano en el sitio

Una vez activo el número MX, actualizar en `index.html`:
- `.nav__phone` (el `href="tel:..."` y el texto visible `+52 ...`)
- El botón flotante `.call-float` (`href="tel:..."`)
- El CTA del hero `#voice-cta` (`href="tel:..."`)

Y en `.env.local` agregar/actualizar:
```
VAPI_PHONE_NUMBER_MX=+52XXXXXXXXXX
```

Opciones de UX a decidir:
- **Reemplazar** el número de EE.UU. por el mexicano (mercado MX prioritario), o
- **Mostrar ambos** (EE.UU. para clientes USA, MX para clientes México) — por ejemplo,
  número MX en el nav y un selector o ambos botones.

Después de editar: `npm run build && npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true`

---

## Resumen de credenciales (todas en `.env.local`)

| Variable | Para qué |
|----------|----------|
| `TELNYX_API_KEY` | Comprar/gestionar números en Telnyx |
| `VAPI_PRIVATE_KEY` | Crear credencial e importar número a VAPI |
| `VAPI_ASSISTANT_ID` | Asistente Sofía al que se asigna el número |
| `VAPI_PHONE_NUMBER` | Número actual de EE.UU. (+16692680598) |
