import { describe, expect, it } from 'vitest'
import { normalizarTelefono } from '../functions/api/llamadas-ia'

describe('normalizarTelefono', () => {
  it('convierte 10 dígitos nacionales a +52', () => {
    expect(normalizarTelefono('6621234567')).toBe('+526621234567')
    expect(normalizarTelefono('662 123 45 67')).toBe('+526621234567')
    expect(normalizarTelefono('(662) 123-4567')).toBe('+526621234567')
  })

  it('respeta números ya en E.164', () => {
    expect(normalizarTelefono('+526621234567')).toBe('+526621234567')
    expect(normalizarTelefono('+16692680598')).toBe('+16692680598')
  })

  it('convierte el formato viejo de celular 521 a +52', () => {
    expect(normalizarTelefono('5216621234567')).toBe('+526621234567')
    expect(normalizarTelefono('+5216621234567')).toBe('+526621234567')
  })

  it('acepta 52 + 10 dígitos sin signo', () => {
    expect(normalizarTelefono('526621234567')).toBe('+526621234567')
  })

  it('acepta EEUU con prefijo 1', () => {
    expect(normalizarTelefono('16692680598')).toBe('+16692680598')
  })

  it('rechaza números inválidos', () => {
    expect(normalizarTelefono('12345')).toBeNull()
    expect(normalizarTelefono('no es teléfono')).toBeNull()
    expect(normalizarTelefono('662123456789012345')).toBeNull()
  })
})
