import { createClient as createAdmin } from '@supabase/supabase-js'

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function fetchECData(ingresoId: string, vehiculoId: string | null, acuerdoInicialId?: string | null) {
  const admin = getAdmin()

  // Cuotas aplicadas a este ingreso
  const { data: raw, error: rawErr } = await admin
    .from('cuota_ingresos')
    .select('cuota_id, monto_aplicado, cuotas(id, numero_cuota, monto, monto_pagado, fecha_vencimiento, credito_id, creditos(plan_tipo))')
    .eq('ingreso_id', ingresoId)

  if (rawErr) console.error('[fetchECData] cuota_ingresos:', rawErr)

  // Saldo de cada cuota AL MOMENTO de este recibo: se parte del saldo real de hoy
  // (monto - monto_pagado, que incluye pagos hechos sin recibo, p.ej. al crear el
  // crédito) y se le suman los pagos con recibo posteriores, para que un recibo
  // reimpreso muestre el saldo que tenía en su momento.
  const cuotaIds = (raw ?? []).map((ci: any) => ci.cuota_id).filter(Boolean)
  const pagosPosterioresPorCuota: Record<string, number> = {}
  if (cuotaIds.length > 0) {
    const { data: ingActual } = await admin.from('ingresos').select('fecha_registro').eq('id', ingresoId).single()
    const fechaActual = (ingActual as any)?.fecha_registro
    if (fechaActual) {
      const { data: hist } = await admin
        .from('cuota_ingresos')
        .select('cuota_id, monto_aplicado, ingresos!inner(id, fecha_registro, estado)')
        .in('cuota_id', cuotaIds)
      for (const p of (hist ?? []) as any[]) {
        const est = p.ingresos?.estado
        if (est === 'anulado' || est === 'rechazado') continue
        if (p.ingresos?.id === ingresoId) continue
        if (p.ingresos?.fecha_registro && p.ingresos.fecha_registro > fechaActual) {
          pagosPosterioresPorCuota[p.cuota_id] = (pagosPosterioresPorCuota[p.cuota_id] ?? 0) + Number(p.monto_aplicado)
        }
      }
    }
  }

  const cuotasAplicadas = (raw ?? []).map((ci: any) => {
    const cuota = ci.cuotas
    const planTipo = cuota?.creditos?.plan_tipo
    const planNombre =
      planTipo === 'inicial_la_oriental' ? 'La Oriental'
      : planTipo === 'financiamiento_vehimotors' ? 'Vehimotors'
      : planTipo === 'asegurate_500' ? 'Asegúrate $500'
      : planTipo === 'credito_40_60' ? '40/60 Vehimotors'
      : 'Crédito'
    const montoTotal = Number(cuota?.monto ?? 0)
    const pagadoReal = Number(cuota?.monto_pagado ?? 0)
    const posteriores = pagosPosterioresPorCuota[cuota?.id] ?? 0
    return {
      numeroCuota: cuota?.numero_cuota ?? 0,
      planNombre,
      fechaVencimiento: cuota?.fecha_vencimiento ?? null,
      montoTotal,
      montoAplicado: Number(ci.monto_aplicado),
      saldoCuota: Math.max(0, montoTotal - pagadoReal + posteriores),
    }
  })

  // Estado de cuenta del vehículo
  let ecTotalFinanciado = 0
  let ecTotalSaldo = 0
  let ecPct = 0
  let ecPagadas = 0
  let ecPendientes = 0
  let ecVencidas = 0
  let creditosDesglose: Array<{ planNombre: string; saldo: number; totalCuotas: number; cuotasPagadas: number }> = []

  if (vehiculoId) {
    const { data: creds, error: credsErr } = await admin
      .from('creditos')
      .select('id, plan_tipo, monto_financiado, saldo, num_cuotas')
      .eq('vehiculo_id', vehiculoId)
      .order('plan_tipo')

    if (credsErr) console.error('[fetchECData] creditos:', credsErr)
    const creditosVehiculo = creds ?? []

    let cuotasVehiculo: any[] = []
    if (creditosVehiculo.length > 0) {
      const { data: cuotas, error: cuotasErr } = await admin
        .from('cuotas')
        .select('id, estado, monto, monto_pagado, credito_id')
        .in('credito_id', creditosVehiculo.map((c: any) => c.id))
      if (cuotasErr) console.error('[fetchECData] cuotas:', cuotasErr)
      cuotasVehiculo = cuotas ?? []
    }

    ecTotalFinanciado = creditosVehiculo.reduce((s: number, c: any) => s + Number(c.monto_financiado ?? 0), 0)

    // Saldo = cuotas pendientes (el inicial ya pagado al crear el crédito no suma)
    ecTotalSaldo = cuotasVehiculo.reduce((s: number, q: any) => {
      if (q.estado === 'pendiente' || q.estado === 'vencida') return s + Number(q.monto)
      if (q.estado === 'abono_parcial') return s + Math.max(0, Number(q.monto) - Number(q.monto_pagado ?? 0))
      return s
    }, 0)
    ecPct = ecTotalFinanciado > 0 ? Math.round(((ecTotalFinanciado - ecTotalSaldo) / ecTotalFinanciado) * 100) : 0
    ecPagadas = cuotasVehiculo.filter((c: any) => c.estado === 'pagada').length
    ecPendientes = cuotasVehiculo.filter((c: any) => c.estado === 'pendiente').length
    ecVencidas = cuotasVehiculo.filter((c: any) => c.estado === 'vencida').length

    creditosDesglose = creditosVehiculo.map((c: any) => {
      const cuotasCred = cuotasVehiculo.filter((q: any) => q.credito_id === c.id)
      const pagadasCred = cuotasCred.filter((q: any) => q.estado === 'pagada').length
      const saldoCred = cuotasCred.reduce((s: number, q: any) => {
        if (q.estado === 'pendiente' || q.estado === 'vencida') return s + Number(q.monto)
        if (q.estado === 'abono_parcial') return s + Math.max(0, Number(q.monto) - Number(q.monto_pagado ?? 0))
        return s
      }, 0)
      const planTipo = c.plan_tipo
      const planNombre =
        planTipo === 'inicial_la_oriental' ? 'La Oriental'
        : planTipo === 'financiamiento_vehimotors' ? 'Vehimotors'
        : planTipo === 'asegurate_500' ? 'Asegúrate $500'
        : planTipo === 'credito_40_60' ? '40/60 Vehimotors'
        : 'Crédito'
      return {
        planNombre,
        saldo: saldoCred,
        totalCuotas: cuotasCred.length,
        cuotasPagadas: pagadasCred,
      }
    })
  }

  // Resumen del acuerdo de pago (si el ingreso vino de uno)
  let acuerdoResumen: {
    montoAcordado: number
    montoPagado: number
    montoPendiente: number
    pct: number
    fechaLimite: string | null
  } | null = null
  if (acuerdoInicialId) {
    const { data: acuerdo } = await admin
      .from('acuerdos_inicial')
      .select('monto_acordado, fecha_limite')
      .eq('id', acuerdoInicialId)
      .single()
    if (acuerdo) {
      // Pagado del acuerdo AL MOMENTO de este recibo: suma en USD de los pagos no
      // anulados registrados hasta este recibo (los Bs se convierten con su tasa).
      const { data: ingEste } = await admin.from('ingresos').select('fecha_registro').eq('id', ingresoId).single()
      const fechaEste = (ingEste as any)?.fecha_registro
      const { data: pagosAcuerdo } = await admin
        .from('ingresos')
        .select('id, monto, moneda, tasa_cambio, estado, fecha_registro')
        .eq('acuerdo_inicial_id', acuerdoInicialId)
      const usdDe = (p: any) => {
        const m = Number(p.monto ?? 0)
        if (p.moneda === 'VES') { const t = Number(p.tasa_cambio ?? 0); return t > 0 ? m / t : 0 }
        return m
      }
      const montoPagado = (pagosAcuerdo ?? [])
        .filter((p: any) => p.estado !== 'anulado' && p.estado !== 'rechazado')
        .filter((p: any) => p.id === ingresoId || !fechaEste || (p.fecha_registro && p.fecha_registro <= fechaEste))
        .reduce((s: number, p: any) => s + usdDe(p), 0)
      const montoAcordado = Number(acuerdo.monto_acordado ?? 0)
      const montoPendiente = Math.max(0, montoAcordado - montoPagado)
      const pct = montoAcordado > 0 ? Math.round((montoPagado / montoAcordado) * 100) : 0
      acuerdoResumen = {
        montoAcordado,
        montoPagado,
        montoPendiente,
        pct,
        fechaLimite: (acuerdo as any).fecha_limite ?? null,
      }
    }
  }

  return { cuotasAplicadas, ecTotalFinanciado, ecTotalSaldo, ecPct, ecPagadas, ecPendientes, ecVencidas, creditosDesglose, acuerdoResumen }
}
