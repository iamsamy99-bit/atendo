# Knowledge Base — Atendo

Base de conocimiento estructurada para nutrir el agente de voz (ElevenLabs) y el chat web (Crisp).

## Archivos

| Archivo | Contenido | Uso principal |
|---|---|---|
| `01-servicios.md` | Descripción detallada de todos los servicios | ElevenLabs KB + Crisp artículo |
| `02-precios.md` | Tablas de precios MXN/USD, planes y condiciones | ElevenLabs KB + Crisp artículo |
| `03-faq.md` | Preguntas frecuentes extendidas | ElevenLabs KB + Crisp artículo |
| `04-objeciones.md` | Cómo manejar las dudas más comunes | ElevenLabs KB + guía para Samuel |
| `05-industrias.md` | Casos de uso por sector (clínicas, restaurantes, etc.) | ElevenLabs KB + ejemplos en demos |
| `06-proceso.md` | Proceso de contratación paso a paso | ElevenLabs KB + Crisp artículo |
| `07-comparacion.md` | Atendo vs. recepcionista / call center / DIY | ElevenLabs KB + guía de ventas |

## Cómo usar en ElevenLabs

1. Ir al dashboard del agente → pestaña **"Knowledge Base"**
2. Clic en **"Add source"** → **"Upload file"**
3. Subir cada archivo `.md` por separado (o combinarlos en uno solo)
4. ElevenLabs indexa el contenido y el agente puede buscar en él durante la conversación

> Recomendación: subir `01-servicios.md`, `02-precios.md` y `03-faq.md` como mínimo.
> Los archivos `04-objeciones.md` y `07-comparacion.md` son más útiles para el agente de ventas.

## Cómo usar en Crisp

1. Ir a **Help Center** en el dashboard de Crisp
2. Crear una colección: "Preguntas frecuentes" y otra "Cómo funciona"
3. Cada archivo `.md` se convierte en un artículo de ayuda
4. Los artículos aparecen en el widget de chat cuando el visitante busca

## Mantenimiento

Actualizar estos archivos cuando:
- Cambien los precios (actualizar `02-precios.md`)
- Se agreguen nuevos servicios (actualizar `01-servicios.md`)
- Aparezcan nuevas preguntas frecuentes (agregar a `03-faq.md`)
- Se identifiquen nuevas objeciones en demos (agregar a `04-objeciones.md`)

## Importante: subir a Vapi como .txt, no como .md

El knowledge base de Vapi **no procesa Markdown**. Los archivos suben bien y
quedan almacenados, pero el parseo falla y el `status` del archivo queda en
`failed` — sin ningún mensaje de error en la API ni en el dashboard.

Esto tuvo el knowledge base de Sofía inservible desde junio hasta el 4 de
septiembre de 2026: respondía solo con su system prompt y nada lo indicaba.
Soporte de Vapi lo reprodujo y confirmó que es un bug de su lado; mientras lo
arreglan, la solución es subir el mismo contenido con extensión `.txt` y
`Content-Type: text/plain`.

```bash
# Convertir y subir
cp 02-precios.md /tmp/02-precios.txt
curl -X POST https://api.vapi.ai/file \
  -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
  -F "file=@/tmp/02-precios.txt;type=text/plain"
```

**Verifica siempre el status después de subir.** Si dice `failed`, el archivo
no está en el índice aunque aparezca listado:

```bash
curl -H "Authorization: Bearer $VAPI_PRIVATE_KEY" https://api.vapi.ai/file \
  | python3 -c "import json,sys; [print(f[\"name\"], f[\"status\"]) for f in json.load(sys.stdin)]"
```

Y recuerda que estos archivos los lee el agente frente al cliente: no dejes
notas internas de costos o márgenes en lo que subas.
