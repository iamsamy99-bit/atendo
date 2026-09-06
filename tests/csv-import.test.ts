import { describe, expect, it } from 'vitest'
import { splitCsvLine } from '../admin/src/csv'

describe('splitCsvLine', () => {
  it('parte una línea simple por comas', () => {
    expect(splitCsvLine('Juan Pérez,Clínica Sur,3171234567,juan@mail.com'))
      .toEqual(['Juan Pérez', 'Clínica Sur', '3171234567', 'juan@mail.com'])
  })

  it('respeta comas dentro de campos entrecomillados', () => {
    // Este es el caso que corrompía la importación: sin manejo de comillas,
    // el teléfono terminaba en la columna de email.
    const parts = splitCsvLine('Ana Ruiz,"Clínica Dental Ejemplo, S.C.",3171234567,ana@mail.com')
    expect(parts).toEqual(['Ana Ruiz', 'Clínica Dental Ejemplo, S.C.', '3171234567', 'ana@mail.com'])
    expect(parts[2]).toBe('3171234567')
  })

  it('soporta tabs y punto y coma como separadores', () => {
    expect(splitCsvLine('Ana\tClínica\t317')).toEqual(['Ana', 'Clínica', '317'])
    expect(splitCsvLine('Ana;Clínica;317')).toEqual(['Ana', 'Clínica', '317'])
  })

  it('limpia el \\r que deja el CRLF al pegar desde Excel', () => {
    expect(splitCsvLine('Ana,Clínica,317\r')).toEqual(['Ana', 'Clínica', '317'])
  })

  it('maneja comillas dobles escapadas dentro de un campo', () => {
    expect(splitCsvLine('Ana,"Clínica ""La Paz""",317'))
      .toEqual(['Ana', 'Clínica "La Paz"', '317'])
  })

  it('conserva las columnas vacías para no recorrer los campos', () => {
    expect(splitCsvLine('Ana,,317,')).toEqual(['Ana', '', '317', ''])
  })
})
