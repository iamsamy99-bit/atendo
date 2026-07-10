-- Seguimientos por correo a leads (envíos manuales y, más adelante, automáticos).

ALTER TABLE leads ADD COLUMN ultimo_seguimiento_at TEXT;

CREATE TABLE IF NOT EXISTS seguimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  asunto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'enviado' CHECK (estado IN ('enviado','fallido')),
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','automatico')),
  error TEXT,
  resend_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_seguimientos_lead ON seguimientos(lead_id);
