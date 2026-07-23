import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, AlertCircle, CheckCircle2, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReportarLoteClient from './ReportarLoteClient'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function ReportarPagosVMPage({ searchParams }: { searchParams: Promise<{ vehiculoId?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  // Filtro opcional por carro (entrada desde el módulo Ventas).
  const { vehiculoId } = await searchParams
  let vehiculoFiltro: { id: string; label: string; placa: string | null } | null = null
  let cuadroVM: {
    precioBase: number; iva: number; placa: number; gastos: number
    totalInicial: number; pBase: number; ivaPlaca: number; banco: string | null
  } | null = null
  if (vehiculoId) {
    const { data: veh } = await supabase.from('vehiculos').select('id, marca, modelo, placa').eq('id', vehiculoId).maybeSingle()
    if (veh) vehiculoFiltro = { id: veh.id, label: `${veh.marca} ${veh.modelo}`, placa: veh.placa }

    // Cuadro de facturación para Vehimotors (P. BASE / IVA-PLACA), desde la
    // proforma/cotización de esta venta.
    const { data: pro } = await supabase
      .from('proformas')
      .select('cotizacion_id, precio_vehiculo, monto_inicial, bn_vehimotors')
      .eq('vehiculo_id', vehiculoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let cot: any = null
    if (pro?.cotizacion_id) {
      const { data: c } = await supabase
        .from('cotizaciones')
        .select('precio_base, iva_monto, gastos_monto, total_inicial, banco, bn_vehimotors')
        .eq('id', pro.cotizacion_id)
        .maybeSingle()
      cot = c
    }
    const bn = (cot?.bn_vehimotors ?? (pro as any)?.bn_vehimotors) as any
    const precioBase = Number(cot?.precio_base ?? pro?.precio_vehiculo ?? 0)
    const iva = Number(cot?.iva_monto ?? (bn?.iva ?? precioBase * 0.16))
    const placa = Number(bn?.placa ?? 400)
    const gastos = Number(cot?.gastos_monto ?? bn?.gastos ?? 0)
    const totalInicial = Number(cot?.total_inicial ?? pro?.monto_inicial ?? 0)
    if (totalInicial > 0 || precioBase > 0) {
      cuadroVM = {
        precioBase, iva, placa, gastos, totalInicial,
        pBase: Math.max(0, totalInicial - iva - placa),
        ivaPlaca: iva + placa,
        banco: cot?.banco ?? bn?.banco ?? null,
      }
    }
  }

  // Cargar ingresos con saldo por reportar: aprobados directos + los que ya
  // pasaron por el flujo de deposito (el dinero ya esta en cuenta VM/Oriental)
  let q = supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, tasa_cambio, monto_bs, metodo_pago, banco_emisor, banco_receptor, referencia, fecha_pago, fecha_aprobacion, placa, cliente_id, vehiculo_id, estado, deposito_banco, deposito_referencia, acuerdo_inicial_id, clientes(nombre, cedula_rif)')
    .in('estado', ['aprobado', 'depositado', 'entregado_carla'])
  if (vehiculoFiltro) {
    const ors = [`vehiculo_id.eq.${vehiculoFiltro.id}`]
    if (vehiculoFiltro.placa) ors.push(`placa.eq.${vehiculoFiltro.placa}`)
    q = q.or(ors.join(','))
  }
  const { data: ingresosAprobados } = await q.order('fecha_aprobacion', { ascending: false })

  // Cargar TODOS los reportes asociados para calcular saldos
  const ingresoIds = (ingresosAprobados ?? []).map(i => i.id)
  const { data: reportes } = ingresoIds.length > 0
    ? await supabase
        .from('reportes_vehimotors')
        .select('ingreso_id, monto_reportado')
        .in('ingreso_id', ingresoIds)
    : { data: [] }

  // Calcular total reportado por ingreso
  const totalReportadoMap: Record<string, number> = {}
  for (const r of reportes ?? []) {
    totalReportadoMap[r.ingreso_id] = (totalReportadoMap[r.ingreso_id] ?? 0) + Number(r.monto_reportado)
  }

  // Los pagos de Inicial La Oriental NO se reportan a Vehimotors.
  // Calcular por ingreso cuanto se aplico a cuotas del credito inicial_la_oriental
  // para descontarlo del monto reportable (un ingreso puede pagar cuotas mixtas).
  const montoOrientalMap: Record<string, number> = {}
  if (ingresoIds.length > 0) {
    const { data: aplicaciones } = await supabase
      .from('cuota_ingresos')
      .select('ingreso_id, monto_aplicado, cuotas!inner(creditos!inner(plan_tipo))')
      .in('ingreso_id', ingresoIds)
    for (const a of (aplicaciones ?? []) as any[]) {
      if (a.cuotas?.creditos?.plan_tipo === 'inicial_la_oriental') {
        montoOrientalMap[a.ingreso_id] = (montoOrientalMap[a.ingreso_id] ?? 0) + Number(a.monto_aplicado)
      }
    }
  }

  // Filtrar ingresos con saldo por reportar > 0.
  // Excluidos del reporte a VM:
  //  - Pagos de acuerdos de pago (acuerdo_inicial_id) -> dinero de La Oriental
  //  - La porcion aplicada a cuotas del credito Inicial La Oriental
  const ingresosPendientes = (ingresosAprobados ?? [])
    .filter(i => !(i as any).acuerdo_inicial_id)
    .map(i => {
      const yaReportado = totalReportadoMap[i.id] ?? 0
      const montoOriental = montoOrientalMap[i.id] ?? 0
      const saldo = Math.max(0, Number(i.monto) - montoOriental - yaReportado)
      return { ...i, yaReportado, saldo }
    })
    .filter(i => i.saldo > 0)

  // Resumen
  const totalSaldo = ingresosPendientes.reduce((s, i) => {
    if (i.moneda === 'VES') {
      return s + (i.tasa_cambio && Number(i.tasa_cambio) > 0 ? i.saldo / Number(i.tasa_cambio) : 0)
    }
    return s + i.saldo
  }, 0)

  // Cantidad de pagos directos (Transferencia bancaria a Vehimotor / USDT VE) sin reportar
  const METODOS_DIRECTOS = ['Transferencia bancaria a Vehimotor', 'USDT VE']
  const directosSinReportar = ingresosPendientes.filter(i => METODOS_DIRECTOS.includes(i.metodo_pago ?? ''))

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/vehimotors" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-oriental-black flex items-center gap-2">
            <Building2 size={20} className="text-indigo-700" />
            Reportar pagos a Vehimotors
          </h1>
          <p className="text-oriental-gray text-xs mt-0.5">
            {vehiculoFiltro
              ? <>Pagos del vehículo <span className="font-bold text-oriental-black">{vehiculoFiltro.label}{vehiculoFiltro.placa ? ` · ${vehiculoFiltro.placa}` : ''}</span></>
              : 'Ingresos aprobados con saldo pendiente de reportar'}
          </p>
        </div>
        {vehiculoFiltro && (
          <Link href="/gestion-ventas" className="text-xs font-bold text-indigo-700 hover:underline shrink-0">← Volver a Ventas</Link>
        )}
      </div>

      {/* Cuadro de facturación para Vehimotors (P. BASE / IVA-PLACA) */}
      {cuadroVM && (() => {
        const f = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        return (
          <div className="mb-6 max-w-md">
            <div className="rounded-xl border border-indigo-200 overflow-hidden">
              <div className="bg-[#1e3a5f] px-4 py-2.5">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">Cuadro para Vehimotors{cuadroVM.banco ? ` · ${cuadroVM.banco}` : ''}</p>
              </div>
              {[
                ['Precio base', cuadroVM.precioBase],
                ['IVA 16%', cuadroVM.iva],
                ['Placa', cuadroVM.placa],
                ['Gastos', cuadroVM.gastos],
                ['Total inicial a pagar', cuadroVM.totalInicial],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between px-4 py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-semibold text-oriental-black">${f(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <span className="font-bold text-amber-800 text-sm">P. BASE</span>
                <span className="font-extrabold text-amber-900">${f(cuadroVM.pBase)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-blue-50">
                <span className="font-bold text-blue-800 text-sm">IVA / PLACA</span>
                <span className="font-extrabold text-blue-900">${f(cuadroVM.ivaPlaca)}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">P. BASE = Total inicial − IVA − Placa. Selecciona abajo los pagos a reportar.</p>
          </div>
        )
      })()}

      {/* Alerta directos */}
      {directosSinReportar.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {directosSinReportar.length} pago{directosSinReportar.length > 1 ? 's' : ''} directo{directosSinReportar.length > 1 ? 's' : ''} a Vehimotors sin reportar
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Estos pagos llegaron directamente a Vehimotors (Transferencia bancaria a Vehimotor o USDT VE). Solo Rojas puede reportarlos al cliente original.
            </p>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Ingresos pendientes</p>
          <p className="text-2xl font-extrabold text-oriental-black">{ingresosPendientes.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-amber-600 uppercase tracking-wider mb-1">Total a reportar (USD equiv.)</p>
          <p className="text-2xl font-extrabold text-amber-600">
            ${totalSaldo.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(totalSaldo)*100)%100===0?0:2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-oriental-gray mt-1">Bolívares convertidos con su tasa</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-red-600 uppercase tracking-wider mb-1">Directos a VM</p>
          <p className="text-2xl font-extrabold text-red-600">{directosSinReportar.length}</p>
        </div>
      </div>

      {/* Lista */}
      {ingresosPendientes.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={36} className="mx-auto text-green-500 mb-3" />
          <p className="text-oriental-gray text-sm font-medium">No hay ingresos pendientes de reportar</p>
          <p className="text-oriental-gray text-xs mt-1">Todos los pagos aprobados ya están reportados a Vehimotors</p>
        </div>
      ) : (
        <ReportarLoteClient
          ingresos={ingresosPendientes.map(i => ({
            id: i.id,
            numeroRecibo: i.numero_recibo,
            concepto: i.concepto,
            monto: Number(i.monto),
            moneda: i.moneda,
            tasaCambio: i.tasa_cambio ? Number(i.tasa_cambio) : null,
            metodoPago: i.metodo_pago,
            bancoEmisor: i.banco_emisor,
            bancoReceptor: i.banco_receptor,
            referencia: i.referencia,
            fechaPago: i.fecha_pago,
            placa: i.placa,
            vehiculoId: (i as any).vehiculo_id ?? null,
            yaReportado: i.yaReportado,
            saldo: i.saldo,
            estado: (i as any).estado ?? 'aprobado',
            depositoBanco: (i as any).deposito_banco ?? null,
            depositoReferencia: (i as any).deposito_referencia ?? null,
            cliente: (i as any).clientes ? {
              id: i.cliente_id,
              nombre: (i as any).clientes.nombre,
              cedula_rif: (i as any).clientes.cedula_rif,
            } : null,
          }))}
          rol={rol}
        />
      )}
    </div>
  )
}
