import { json, type Env } from '../../_lib/auth'
import { PLANTILLAS } from '../../_lib/templates'

// GET /api/seguimiento/plantillas — catálogo de plantillas para el selector.
export const onRequestGet: PagesFunction<Env> = async () => json(PLANTILLAS)
