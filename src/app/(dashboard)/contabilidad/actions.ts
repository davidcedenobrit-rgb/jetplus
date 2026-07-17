'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { esSuperAdmin } from '@/lib/super-admin'
import { CATALOGO, simularImportacion } from '@/lib/contabilidad/plan-cuentas'

// Aplica la importación del catálogo a la base de datos. Solo super-admin.
// Idempotente por versión: si ya existe una versión con ese nombre, no duplica.
// Requiere que la migración 027_contabilidad_base.sql esté aplicada.
export async function aplicarImportacion(confirmacion: string): Promise<{ ok: boolean; mensaje: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'No autenticado' }
  if (!esSuperAdmin(user.email)) return { ok: false, mensaje: 'Sin permisos' }
  if (confirmacion !== 'IMPORTAR') return { ok: false, mensaje: 'Confirmación inválida' }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, mensaje: 'Faltan credenciales de servicio' }
  const svc = createServiceClient(url, key)

  const sim = simularImportacion()

  // Crea (o reutiliza) la versión
  const { data: existente } = await svc
    .from('plan_cuentas_versiones')
    .select('id')
    .eq('nombre', CATALOGO.version)
    .maybeSingle()

  if (existente) {
    return { ok: false, mensaje: `La versión "${CATALOGO.version}" ya fue importada. No se duplica.` }
  }

  const { data: version, error: vErr } = await svc
    .from('plan_cuentas_versiones')
    .insert({ nombre: CATALOGO.version, descripcion: 'Importación inicial del catálogo', fuente: CATALOGO.fuente, estado: 'borrador' })
    .select('id')
    .single()

  if (vErr || !version) {
    // 23505 = unique_violation: otra importación de la misma versión corrió en paralelo.
    if (vErr?.code === '23505') {
      return { ok: false, mensaje: `La versión "${CATALOGO.version}" ya está siendo importada o existe. No se duplica.` }
    }
    return { ok: false, mensaje: `No se pudo crear la versión: ${vErr?.message ?? 'error'}. ¿Se aplicó la migración 027?` }
  }

  const filas = CATALOGO.cuentas.map(c => ({
    version_id: version.id,
    codigo: c.codigo,
    codigo_original: c.codigo_original,
    nombre: c.nombre,
    clase: c.clase,
    nivel: c.nivel,
    padre: c.padre,
    naturaleza: c.naturaleza,
    naturaleza_propuesta: c.naturaleza_propuesta,
    tipo: c.tipo,
    acepta_movimientos: c.acepta_movimientos,
    estado_financiero: c.estado_financiero,
    requiere_centro_costo: c.requiere_centro_costo,
    requiere_tercero: c.requiere_tercero,
    requiere_vehiculo: c.requiere_vehiculo,
    requiere_doc_fiscal: c.requiere_doc_fiscal,
    origen: c.origen,
    estado: 'pendiente',
    observacion: c.observacion,
  }))

  // Inserta en lotes de 500
  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500)
    const { error } = await svc.from('plan_cuentas').insert(lote)
    if (error) return { ok: false, mensaje: `Error insertando cuentas: ${error.message}` }
  }

  await svc.from('catalogo_importaciones').insert({
    version_id: version.id,
    modo: 'aplicada',
    total: sim.total,
    insertadas: filas.length,
    advertencias: sim.advertencias.length,
    resumen: { porClase: sim.porClase, titulos: sim.titulos, movimiento: sim.movimiento },
    ejecutado_por: user.email ?? null,
  })

  return { ok: true, mensaje: `Importadas ${filas.length} cuentas en la versión "${CATALOGO.version}" (estado borrador, pendiente de activación).` }
}
