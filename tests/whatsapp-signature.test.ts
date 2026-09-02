import { describe, expect, it } from 'vitest'
import { verifySignature } from '../functions/_lib/meta-whatsapp'

const SECRET = 'app-secret-de-prueba'
const BODY = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '123' }] })

/** Firma HMAC-SHA256 en hex, igual que la que manda Meta. */
async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('verifySignature', () => {
  it('acepta una firma válida de Meta', async () => {
    const header = `sha256=${await sign(BODY, SECRET)}`
    expect(await verifySignature(BODY, header, SECRET)).toBe(true)
  })

  it('acepta la firma en mayúsculas (Meta no garantiza el case del hex)', async () => {
    const header = `sha256=${(await sign(BODY, SECRET)).toUpperCase()}`
    expect(await verifySignature(BODY, header, SECRET)).toBe(true)
  })

  it('rechaza un cuerpo alterado con la firma original', async () => {
    const header = `sha256=${await sign(BODY, SECRET)}`
    const forged = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'atacante' }] })
    expect(await verifySignature(forged, header, SECRET)).toBe(false)
  })

  it('rechaza una firma hecha con otro secreto', async () => {
    const header = `sha256=${await sign(BODY, 'secreto-del-atacante')}`
    expect(await verifySignature(BODY, header, SECRET)).toBe(false)
  })

  it('rechaza cuando no hay header de firma', async () => {
    expect(await verifySignature(BODY, null, SECRET)).toBe(false)
  })

  it('rechaza cuando el secreto no está configurado, en vez de dejar pasar', async () => {
    const header = `sha256=${await sign(BODY, SECRET)}`
    expect(await verifySignature(BODY, header, null)).toBe(false)
  })

  it('rechaza un header con prefijo o formato inválido', async () => {
    const hex = await sign(BODY, SECRET)
    expect(await verifySignature(BODY, hex, SECRET)).toBe(false)
    expect(await verifySignature(BODY, `sha1=${hex}`, SECRET)).toBe(false)
    expect(await verifySignature(BODY, 'sha256=no-es-hex', SECRET)).toBe(false)
  })
})
