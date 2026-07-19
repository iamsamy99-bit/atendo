-- Esquema del CRM de Atendo (Cloudflare D1 / SQLite)
-- Estados de leads segun docs/lead-flow.md

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  nombre TEXT NOT NULL,
  negocio TEXT,
  industria TEXT,
  email TEXT,
  telefono TEXT,
  plan TEXT,
  mensualidad REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pausado','cancelado')),
  fecha_inicio TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  canal TEXT NOT NULL DEFAULT 'otro' CHECK (canal IN ('calendly','telefono','whatsapp','crisp','pricing','referido','otro')),
  origen TEXT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  empresa TEXT,
  industria TEXT,
  necesidad TEXT,
  volumen_estimado TEXT,
  plan_interes TEXT,
  idioma TEXT NOT NULL DEFAULT 'es',
  siguiente_accion TEXT,
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo','contactado','calificado','demo_agendada','propuesta_enviada','ganado','perdido')),
  motivo_perdida TEXT,
  notas TEXT,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  monto REAL NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  fecha TEXT NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'transferencia' CHECK (metodo IN ('transferencia','tarjeta','efectivo','otro')),
  concepto TEXT,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_curso','resuelto')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta')),
  resuelto_at TEXT,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);

-- Llamadas salientes con IA (Sofía Ventas vía Vapi), ligadas a su lead
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

-- Cola del marcador automático de campañas (worker-campanas la consume por cron)
CREATE TABLE IF NOT EXISTS campana_cola (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','llamada_iniciada','omitida','error')),
  detalle TEXT
);
CREATE INDEX IF NOT EXISTS idx_campana_cola_estado ON campana_cola(estado);

-- Solicitudes de callback desde la landing (rate-limit + auditoría)
CREATE TABLE IF NOT EXISTS callback_solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT,
  telefono TEXT NOT NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida','llamada','rechazada')),
  detalle TEXT
);
CREATE INDEX IF NOT EXISTS idx_callback_fecha ON callback_solicitudes(created_at);

-- Sesiones del dashboard (login superadmin)
CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- Config: hash de contraseña del superadmin y clave de ingesta para Make
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
