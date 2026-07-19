#!/usr/bin/env bash
# Deploy de la feature de llamadas salientes con IA (Sofía Ventas + campañas).
# Uso: bash scripts/deploy-llamadas-ia.sh   (desde cualquier lado; se ubica solo)
# Idempotente: correrlo dos veces no rompe nada.
set -euo pipefail
cd "$(dirname "$0")/.."

VAPI_PRIVATE_KEY=$(grep '^VAPI_PRIVATE_KEY=' .env.local | cut -d= -f2-)
if [ -z "$VAPI_PRIVATE_KEY" ]; then echo "Falta VAPI_PRIVATE_KEY en .env.local"; exit 1; fi

echo "== 1/5 Migración D1 remota (llamadas_ia + campana_cola) =="
npx wrangler d1 execute atendo-crm --remote --command "
CREATE TABLE IF NOT EXISTS llamadas_ia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  call_id TEXT NOT NULL UNIQUE,
  telefono TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'iniciada' CHECK (estado IN ('iniciada','completada','fallida')),
  resultado TEXT,
  resumen TEXT
);
CREATE INDEX IF NOT EXISTS idx_llamadas_ia_lead ON llamadas_ia(lead_id);
CREATE TABLE IF NOT EXISTS campana_cola (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','llamada_iniciada','omitida','error')),
  detalle TEXT
);
CREATE INDEX IF NOT EXISTS idx_campana_cola_estado ON campana_cola(estado);"

echo "== 2/5 Secret VAPI_PRIVATE_KEY en Pages =="
printf '%s' "$VAPI_PRIVATE_KEY" | npx wrangler pages secret put VAPI_PRIVATE_KEY --project-name atendo

echo "== 3/5 Build + deploy de Pages (atendo.lat) =="
npm run build
npx wrangler pages deploy dist --project-name atendo --branch main --commit-dirty=true

echo "== 4/5 Deploy del worker atendo-campanas =="
(cd worker-campanas && npx wrangler deploy)

echo "== 5/5 Secrets del worker =="
if ! grep -q '^CRON_RUN_KEY_CAMPANAS=' .env.local; then
  KEY="runc_$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  printf '\n# Disparo manual del worker de campañas (GET /run?key=...)\nCRON_RUN_KEY_CAMPANAS=%s\n' "$KEY" >> .env.local
fi
CRON_RUN_KEY_CAMPANAS=$(grep '^CRON_RUN_KEY_CAMPANAS=' .env.local | cut -d= -f2-)
(cd worker-campanas && printf '%s' "$VAPI_PRIVATE_KEY" | npx wrangler secret put VAPI_PRIVATE_KEY)
(cd worker-campanas && printf '%s' "$CRON_RUN_KEY_CAMPANAS" | npx wrangler secret put CRON_RUN_KEY)

echo ""
echo "✅ Listo. Prueba: crea un lead con tu celular en el dashboard y pícale '📞 Llamar con IA'."
echo "   Disparo manual del marcador: https://atendo-campanas.iamsamy99.workers.dev/run?key=$CRON_RUN_KEY_CAMPANAS"
