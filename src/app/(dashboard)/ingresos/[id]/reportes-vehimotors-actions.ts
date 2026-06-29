'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const METODOS_DIRECTOS_VM = ['Transferencia bancaria a Vehimotor', 'USDT VE']
const ROL_DIRECTOR = ['jose', 'admin', 'director']

export type CrearReportePayload = {
  ingresoId: string
  clienteReportadoId: string
  vehiculoId: string | null
  placa: string | null
  proformaVehimotors: string | null
  montoReportado: number
  observaciones: string | null
}

export async function crearReporteVehimotors(payload: CrearReportePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rol = (user.app_metadata?.rol as string) ?? ''
  const esJose = ROL_DIRECTOR.includes(rol)

  const admin = await createAdminClient()

  // 1. Cargar ingreso
  const { data: ingreso, error: errIng } = await admin
    .from('ingresos')
    .select('id, cliente_id, monto, moneda, tasa_cambio, monto_bs, metodo_pago, estado')
    .eq('id', payload.ingresoId)
    .single()

  if (errIng || !ingreso) return { error: 'Ingreso no encontrado' }
  if (ingreso.estado !== 'aprobado' && ingreso.estado !== 'reportado_vehimotors') {
    return { error: 'El ingreso debe estar aprobado para poder reportarse' }
  }

  // 2. Validaciones de permisos
  const esDirecto = METODOS_DIRECTOS_VM.includes(ingreso.metodo_pago ?? '')
  if (esDirecto && !esJose) {
    return { error: 'Solo el director puede reportar pagos directos a Vehimotors' }
  }
  if (esDirecto && payload.clienteReportadoId !== ingreso.cliente_id) {
    return { error: 'Los pagos directos a Vehimotors deben reportarse al cliente que pagó' }
  }
  if (!esDirecto && payload.clienteReportadoId !== ingreso.cliente_id && !esJose) {
    return { error: 'Solo el director puede reportar a un cliente diferente al que pagó' }
  }

  // 3. Validar monto
  if (!Number.isFinite(payload.montoReportado) || payload.montoReportado <= 0) {
    return { error: 'El monto reportado debe ser mayor a 0' }
  }
  if (payload.montoReportado > 10_000_000) {
    return { error: 'Monto fuera de rango' }
  }

  // 4. Validar cliente destino existe
  const { data: clienteDestino } = await admin
    .from('clientes')
    .select('id, nombre')
    .eq('id', payload.clienteReportadoId)
    .single()
  if (!clienteDestino) return { error: 'Cliente destino no encontrado' }

  // 5. Insertar reporte
  const { data: reporte, error: errInsert } = await admin
    .from('reportes_vehimotors')
    .insert({
      ingreso_id: payload.ingresoId,
      cliente_id: payload.clienteReportadoId,
      vehiculo_id: payload.vehiculoId,
      placa: payload.placa,
      proforma_vehimotors: payload.proformaVehimotors,
      monto_reportado: payload.montoReportado,
      moneda: ingreso.moneda,
      tasa_cambio: ingreso.tasa_cambio,
      monto_bs: ingreso.monto_bs,
      registrado_por: user.id,
      observaciones: payload.observaciones,
    })
    .select('id')
    .single()

  if (errInsert) return { error: 'Error al guardar el reporte: ' + errInsert.message }

  // 6. Calcular total reportado y actualizar estado del ingreso si llegó al monto o lo superó
  const { data: reportes } = await admin
    .from('reportes_vehimotors')
    .select('monto_reportado')
    .eq('ingreso_id', payload.ingresoId)

  const totalReportado = (reportes ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)
  const ingresoMonto = Number(ingreso.monto)

  if (totalReportado >= ingresoMonto) {
    await admin.from('ingresos')
      .update({
        estado: 'reportado_vehimotors',
        vehimotors_at: new Date().toISOString(),
      })
      .eq('id', payload.ingresoId)
  }

  return { ok: true, reporteId: reporte.id, totalReportado, ingresoMonto }
}

export async function eliminarReporteVehimotors(reporteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_DIRECTOR.includes(rol)) {
    return { error: 'Solo el director puede eliminar reportes' }
  }

  const admin = await createAdminClient()

  const { data: reporte } = await admin
    .from('reportes_vehimotors')
    .select('id, ingreso_id, estado')
    .eq('id', reporteId)
    .single()

  if (!reporte) return { error: 'Reporte no encontrado' }
  if (reporte.estado === 'confirmado') {
    return { error: 'No se puede eliminar un reporte ya confirmado por Vehimotors' }
  }

  const { error: errDel } = await admin
    .from('reportes_vehimotors')
    .delete()
    .eq('id', reporteId)

  if (errDel) return { error: 'Error al eliminar el reporte' }

  // Recalcular estado del ingreso
  const { data: reportes } = await admin
    .from('reportes_vehimotors')
    .select('monto_reportado')
    .eq('ingreso_id', reporte.ingreso_id)

  const { data: ingreso } = await admin
    .from('ingresos')
    .select('monto, estado')
    .eq('id', reporte.ingreso_id)
    .single()

  if (ingreso) {
    const totalReportado = (reportes ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)
    if (totalReportado < Number(ingreso.monto) && ingreso.estado === 'reportado_vehimotors') {
      await admin.from('ingresos')
        .update({ estado: 'aprobado', vehimotors_at: null })
        .eq('id', reporte.ingreso_id)
    }
  }

  return { ok: true }
}

export async function buscarClientes(query: string) {
  if (query.trim().length < 2) return { clientes: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', clientes: [] }

  const admin = await createAdminClient()
  const q = query.trim()
  const { data, error } = await admin
    .from('clientes')
    .select('id, nombre, cedula_rif')
    .or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
    .eq('activo', true)
    .order('nombre')
    .limit(20)

  if (error) return { error: 'Error al buscar clientes', clientes: [] }
  return { clientes: data ?? [] }
}

export async function getVehiculosCliente(clienteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', vehiculos: [] }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('vehiculos')
    .select('id, marca, modelo, placa, proforma_vehimotors')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Error al cargar vehículos', vehiculos: [] }
  return { vehiculos: data ?? [] }
}
