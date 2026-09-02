-- Canal WhatsApp + configuración operativa del chatbot.

CREATE TABLE IF NOT EXISTS bot_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  scope TEXT NOT NULL UNIQUE DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'Atendo',
  assistant_name TEXT NOT NULL DEFAULT 'Sofia',
  tone TEXT NOT NULL DEFAULT 'profesional, claro y humano',
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  booking_url TEXT,
  calendar_event_type_id INTEGER,
  contact_email TEXT,
  system_prompt TEXT,
  faq_json TEXT,
  pricing_json TEXT,
  discovery_questions_json TEXT,
  confirmation_email_subject TEXT,
  confirmation_email_template TEXT,
  confirmation_whatsapp_template TEXT
);

INSERT OR IGNORE INTO bot_configs (
  scope,
  business_name,
  assistant_name,
  booking_url,
  contact_email,
  system_prompt,
  faq_json,
  pricing_json,
  discovery_questions_json,
  confirmation_email_subject,
  confirmation_email_template,
  confirmation_whatsapp_template
) VALUES (
  'default',
  'Atendo',
  'Sofia',
  'https://cal.com/samuel-garcia-gbsw4p/30min',
  'hola@atendo.lat',
  'Eres una asesora comercial de Atendo. Escribes como una profesional real por WhatsApp. Respondes con naturalidad, sin decir que eres IA salvo que sea legalmente obligatorio. Tu objetivo es ayudar, calificar, cotizar con datos reales y cerrar la cita cuando haga sentido.',
  '{"horarios":"Atendemos demos y configuraciones con horario del centro de Mexico.","idiomas":"Atendemos en espanol e ingles.","producto":"Atendo crea agentes de voz y chat con IA para responder dudas, cotizar y agendar citas."}',
  '{"base_currency":"MXN","plans":[{"code":"esencial","name":"Esencial","price_from":3490,"billing":"mensual","notes":"Ideal para negocios con recepcion y citas basicas."},{"code":"pro","name":"Pro","price_from":6990,"billing":"mensual","notes":"Incluye mas personalizacion, flujos y seguimiento."}]}',
  '["Cuantas conversaciones o citas manejan por semana?","Que servicio o producto quieren que el bot cotice?","Usan algun calendario o CRM hoy?"]',
  'Confirmacion de cita con Atendo',
  'Hola {nombre}, tu cita con Atendo quedo confirmada para {fecha_hora}. Si necesitas reagendar, responde a este correo.',
  'Listo {nombre}, tu cita quedo confirmada para {fecha_hora}. Si quieres moverla, te ayudo por aqui.'
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  wa_id TEXT NOT NULL UNIQUE,
  telefono TEXT NOT NULL,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','cerrada','handoff')),
  idioma TEXT NOT NULL DEFAULT 'es',
  last_message_at TEXT,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  conversation_id INTEGER NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  meta_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','interactive','template','system')),
  text TEXT,
  payload_json TEXT,
  delivered_at TEXT,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id, created_at);
-- Meta reintenta el webhook si no recibe 200 a tiempo. Sin esta restriccion el
-- reintento reprocesaba el mensaje: respuesta duplicada al cliente y la misma
-- nota agregada dos veces al lead. (En SQLite los NULL no colisionan, asi que
-- los mensajes salientes sin id de Meta siguen insertandose sin problema.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON whatsapp_messages(meta_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  event_type TEXT NOT NULL,
  meta_object TEXT,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_type ON whatsapp_events(event_type, created_at);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','telefono','web','manual')),
  conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  starts_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  external_booking_id TEXT,
  external_calendar TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmada','cancelada','error')),
  quote_json TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
