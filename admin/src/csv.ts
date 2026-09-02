/**
 * Parte una línea de CSV/TSV respetando comillas dobles. Un `split(/[,\t;]/)`
 * plano rompía cualquier registro con coma dentro de un campo entrecomillado
 * ("Clínica Dental Juárez, S.C."), recorriendo todas las columnas siguientes:
 * el teléfono caía en email, el email en industria, etc.
 * También limpia el `\r` final que deja el CRLF al pegar desde Excel.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        // Comilla doble escapada ("") dentro de un campo entrecomillado.
        if (line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += char
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',' || char === '\t' || char === ';') {
      out.push(field)
      field = ''
    } else field += char
  }
  out.push(field)
  return out.map(f => f.replace(/\r$/, '').trim())
}
