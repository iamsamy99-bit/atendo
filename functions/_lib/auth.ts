/// <reference types="@cloudflare/workers-types" />
// Autenticación del dashboard: verificación PBKDF2 + sesiones en D1.

export interface Env {
  DB: D1Database
}

const SESSION_COOKIE = 'atendo_session'
const SESSION_DAYS = 30

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

export function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Verifica una contraseña contra el formato almacenado `pbkdf2$iter$saltB64$hashB64`. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = parseInt(parts[1], 10)
  const salt = b64ToBytes(parts[2])
  const expected = b64ToBytes(parts[3])

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
    key,
    expected.length * 8
  )
  const actual = new Uint8Array(bits)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

export async function getConfig(db: D1Database, clave: string): Promise<string | null> {
  const row = await db.prepare('SELECT valor FROM config WHERE clave = ?').bind(clave).first<{ valor: string }>()
  return row?.valor ?? null
}

export async function createSession(db: D1Database): Promise<{ token: string; cookie: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await db.prepare('INSERT INTO sesiones (token, expires_at) VALUES (?, ?)').bind(token, expires.toISOString()).run()
  const cookie = `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`
  return { token, cookie }
}

export async function getSession(req: Request, db: D1Database): Promise<boolean> {
  const token = parseCookies(req)[SESSION_COOKIE]
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false
  const row = await db
    .prepare("SELECT token FROM sesiones WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first()
  return !!row
}

export async function destroySession(req: Request, db: D1Database): Promise<string> {
  const token = parseCookies(req)[SESSION_COOKIE]
  if (token) await db.prepare('DELETE FROM sesiones WHERE token = ?').bind(token).run()
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
