import { createClient as createAdmin } from '@supabase/supabase-js'

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function fetchECData(ingresoId: string, vehiculoId: string | null) {
  const admin = getAdmin()

  // Cuotas aplicadas a este ingreso
  const { data: raw, error: rawErr } = await admin
    .from('cuota_ingresos')
    .select('monto_aplicado, cuotas(numero_cuota, monto, fecha_vencimiento, credito_id, creditos(plan_tipo))')
    .eq('ingreso_id', ingresoId)

  if (rawErr) console.error('[fetchECData] cuota_ingresos:', rawErr)

  const cuotasAplicadas = (raw ?? []).map((ci: any) => {
    const cuota = ci.cuotas
    const planTipo = cuota?.creditos?.plan_tipo
    const planNombre =
      planTipo === 'inicial_la_oriental' ? 'La Oriental'
      : planTipo === 'financiamiento_vehimotors' ? 'Vehimotors'
      : 'Crédito'
    return {
      numeroCuota: cuota?.numero_cuota ?? 0,
      planNombre,
      fechaVencimiento: cuota?.fecha_vencimiento ?? null,
      montoTotal: Number(cuota?.monto ?? 0),
      montoAplicado: Number(ci.monto_aplicado),
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
        .select('id, estado, credito_id')
        .in('credito_id', creditosVehiculo.map((c: any) => c.id))
      if (cuotasErr) console.error('[fetchECData] cuotas:', cuotasErr)
      cuotasVehiculo = cuotas ?? []
    }

    ecTotalFinanciado = creditosVehiculo.reduce((s: number, c: any) => s + Number(c.monto_financiado ?? 0), 0)
    ecTotalSaldo = creditosVehiculo.reduce((s: number, c: any) => s + Number(c.saldo ?? 0), 0)
    const ecTotalPagado = ecTotalFinanciado - ecTotalSaldo
    ecPct = ecTotalFinanciado > 0 ? Math.round((ecTotalPagado / ecTotalFinanciado) * 100) : 0
    ecPagadas = cuotasVehiculo.filter((c: any) => c.estado === 'pagada').length
    ecPendientes = cuotasVehiculo.filter((c: any) => c.estado === 'pendiente').length
    ecVencidas = cuotasVehiculo.filter((c: any) => c.estado === 'vencida').length

    creditosDesglose = creditosVehiculo.map((c: any) => {
      const cuotasCred = cuotasVehiculo.filter((q: any) => q.credito_id === c.id)
      const pagadasCred = cuotasCred.filter((q: any) => q.estado === 'pagada').length
      const planTipo = c.plan_tipo
      const planNombre =
        planTipo === 'inicial_la_oriental' ? 'La Oriental'
        : planTipo === 'financiamiento_vehimotors' ? 'Vehimotors'
        : 'Crédito'
      return {
        planNombre,
        saldo: Number(c.saldo ?? 0),
        totalCuotas: cuotasCred.length,
        cuotasPagadas: pagadasCred,
      }
    })
  }

  return { cuotasAplicadas, ecTotalFinanciado, ecTotalSaldo, ecPct, ecPagadas, ecPendientes, ecVencidas, creditosDesglose }
}
