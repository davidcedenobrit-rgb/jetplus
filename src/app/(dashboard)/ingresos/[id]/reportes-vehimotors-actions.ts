'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarReporteLoteVehimotors, type ReporteLoteItem } from '@/lib/email-ingresos'

const METODOS_DIRECTOS_VM = ['Transferencia bancaria a Vehimotor', 'USDT VE']
const ROL_DIRECTOR = ['jose', 'admin', 'director']

function montoToUSD(monto: number, moneda: string, tasaCambio: number | null): number {
  if (moneda === 'VES') {
    return tasaCambio && tasaCambio > 0 ? monto / tasaCambio : 0
  }
  return monto
}

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
    .select('id, cliente_id, numero_recibo, monto, moneda, tasa_cambio, monto_bs, metodo_pago, banco_emisor, banco_receptor, referencia, fecha_pago, estado')
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

  // 3. Validar monto: positivo y dentro del saldo restante del ingreso
  if (!Number.isFinite(payload.montoReportado) || payload.montoReportado <= 0) {
    return { error: 'El monto reportado debe ser mayor a 0' }
  }
  if (payload.montoReportado > 10_000_000) {
    return { error: 'Monto fuera de rango' }
  }
  // Calcular saldo restante del ingreso antes de aceptar el reporte
  const { data: reportesPrev } = await admin
    .from('reportes_vehimotors')
    .select('monto_reportado')
    .eq('ingreso_id', payload.ingresoId)
  const yaReportado = (reportesPrev ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)
  const saldoDisponible = Math.max(0, Number(ingreso.monto) - yaReportado)
  if (payload.montoReportado > saldoDisponible + 0.01) {
    return { error: `El monto excede el saldo disponible del ingreso. Saldo restante: ${saldoDisponible.toFixed(2)} ${ingreso.moneda}` }
  }

  // 4. Validar cliente destino existe
  const { data: clienteDestino } = await admin
    .from('clientes')
    .select('id, nombre, cedula_rif')
    .eq('id', payload.clienteReportadoId)
    .single()
  if (!clienteDestino) return { error: 'Cliente destino no encontrado' }

  // 4b. Datos del vehículo reportado (para el correo)
  let vehiculoLabel: string | null = null
  if (payload.vehiculoId) {
    const { data: veh } = await admin
      .from('vehiculos')
      .select('marca, modelo, placa')
      .eq('id', payload.vehiculoId)
      .single()
    if (veh) vehiculoLabel = `${veh.marca} ${veh.modelo}${veh.placa ? ' · ' + veh.placa : ''}`
  }

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

  // 7. Enviar correo a Vehimotors (no bloquea el flujo si falla)
  try {
    const item: ReporteLoteItem = {
      fechaPago: ingreso.fecha_pago,
      proforma: payload.proformaVehimotors,
      placa: payload.placa,
      vehiculoLabel,
      clienteNombre: clienteDestino.nombre,
      cedulaRif: clienteDestino.cedula_rif,
      concepto: 'Pago de cliente',
      consesionario: 'LA ORIENTAL',
      montoUSD: montoToUSD(payload.montoReportado, ingreso.moneda, ingreso.tasa_cambio ? Number(ingreso.tasa_cambio) : null),
      bancoVehimotors: ingreso.banco_receptor ?? ingreso.banco_emisor ?? ingreso.metodo_pago,
      referencia: ingreso.referencia,
      numeroRecibo: ingreso.numero_recibo,
      observaciones: payload.observaciones,
    }
    await enviarReporteLoteVehimotors({ items: [item] })
  } catch (e) {
    console.error('[reportes-vm] error enviando correo:', e)
    // No retornamos error — el reporte ya está guardado en BD
  }

  return { ok: true, reporteId: reporte.id, totalReportado, ingresoMonto }
}

// ─── Lote: crea N reportes + envía 1 correo consolidado ────────────────────

export type ReporteLotePayload = {
  ingresoId: string
  clienteReportadoId: string
  vehiculoId: string | null
  placa: string | null
  proformaVehimotors: string | null
  montoReportado: number
  observaciones: string | null
}

export async function crearLoteReportesVehimotors(items: ReporteLotePayload[]) {
  if (items.length === 0) return { error: 'Lote vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rol = (user.app_metadata?.rol as string) ?? ''
  const esJose = ROL_DIRECTOR.includes(rol)

  const admin = await createAdminClient()
  const itemsCorreo: ReporteLoteItem[] = []
  const errores: string[] = []
  let guardados = 0

  for (const payload of items) {
    // Cargar ingreso
    const { data: ingreso } = await admin
      .from('ingresos')
      .select('id, cliente_id, numero_recibo, monto, moneda, tasa_cambio, monto_bs, metodo_pago, banco_emisor, banco_receptor, referencia, fecha_pago, estado, concepto')
      .eq('id', payload.ingresoId)
      .single()

    if (!ingreso) {
      errores.push(`Ingreso ${payload.ingresoId} no encontrado`)
      continue
    }
    if (ingreso.estado !== 'aprobado' && ingreso.estado !== 'reportado_vehimotors') {
      errores.push(`Ingreso ${ingreso.numero_recibo} no está aprobado`)
      continue
    }

    const esDirecto = METODOS_DIRECTOS_VM.includes(ingreso.metodo_pago ?? '')
    if (esDirecto && !esJose) {
      errores.push(`${ingreso.numero_recibo}: solo el director puede reportar pagos directos`)
      continue
    }
    if (esDirecto && payload.clienteReportadoId !== ingreso.cliente_id) {
      errores.push(`${ingreso.numero_recibo}: pagos directos deben reportarse al cliente que pagó`)
      continue
    }
    if (!esDirecto && payload.clienteReportadoId !== ingreso.cliente_id && !esJose) {
      errores.push(`${ingreso.numero_recibo}: solo el director puede reportar a otro cliente`)
      continue
    }
    if (!Number.isFinite(payload.montoReportado) || payload.montoReportado <= 0) {
      errores.push(`${ingreso.numero_recibo}: monto inválido`)
      continue
    }

    // Validar saldo disponible
    const { data: reportesPrev } = await admin
      .from('reportes_vehimotors')
      .select('monto_reportado')
      .eq('ingreso_id', payload.ingresoId)
    const yaReportado = (reportesPrev ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)
    const saldoDisponible = Math.max(0, Number(ingreso.monto) - yaReportado)
    if (payload.montoReportado > saldoDisponible + 0.01) {
      errores.push(`${ingreso.numero_recibo}: monto excede saldo (${saldoDisponible.toFixed(2)} ${ingreso.moneda})`)
      continue
    }

    // Cliente destino
    const { data: clienteDestino } = await admin
      .from('clientes')
      .select('id, nombre, cedula_rif')
      .eq('id', payload.clienteReportadoId)
      .single()
    if (!clienteDestino) {
      errores.push(`${ingreso.numero_recibo}: cliente destino no encontrado`)
      continue
    }

    // Vehículo (label para correo)
    let vehiculoLabel: string | null = null
    if (payload.vehiculoId) {
      const { data: veh } = await admin
        .from('vehiculos')
        .select('marca, modelo, placa')
        .eq('id', payload.vehiculoId)
        .single()
      if (veh) vehiculoLabel = `${veh.marca} ${veh.modelo}${veh.placa ? ' · ' + veh.placa : ''}`
    }

    // Insertar reporte
    const { error: errInsert } = await admin
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

    if (errInsert) {
      errores.push(`${ingreso.numero_recibo}: ${errInsert.message}`)
      continue
    }

    guardados++

    // Recalcular estado del ingreso
    const { data: reportes } = await admin
      .from('reportes_vehimotors')
      .select('monto_reportado')
      .eq('ingreso_id', payload.ingresoId)
    const totalReportado = (reportes ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)
    if (totalReportado >= Number(ingreso.monto)) {
      await admin.from('ingresos')
        .update({ estado: 'reportado_vehimotors', vehimotors_at: new Date().toISOString() })
        .eq('id', payload.ingresoId)
    }

    // Acumular para correo consolidado
    itemsCorreo.push({
      fechaPago: ingreso.fecha_pago,
      proforma: payload.proformaVehimotors,
      placa: payload.placa,
      vehiculoLabel,
      clienteNombre: clienteDestino.nombre,
      cedulaRif: clienteDestino.cedula_rif,
      concepto: ingreso.concepto ?? 'Pago de cliente',
      consesionario: 'LA ORIENTAL',
      montoUSD: montoToUSD(payload.montoReportado, ingreso.moneda, ingreso.tasa_cambio ? Number(ingreso.tasa_cambio) : null),
      bancoVehimotors: ingreso.banco_receptor ?? ingreso.banco_emisor ?? ingreso.metodo_pago,
      referencia: ingreso.referencia,
      numeroRecibo: ingreso.numero_recibo,
      observaciones: payload.observaciones,
    })
  }

  // Enviar correo consolidado solo si hay items
  if (itemsCorreo.length > 0) {
    try {
      await enviarReporteLoteVehimotors({ items: itemsCorreo })
    } catch (e) {
      console.error('[lote-vm] error enviando correo:', e)
      return { ok: true, guardados, errores: [...errores, 'Reportes guardados pero hubo un problema al enviar el correo'] }
    }
  }

  return { ok: true, guardados, errores }
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
