import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, AlertCircle, CheckCircle2, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReportarLoteClient from './ReportarLoteClient'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function ReportarPagosVMPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) redirect('/dashboard')

  // Cargar todos los ingresos aprobados (incluye los reportados parcialmente)
  const { data: ingresosAprobados } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, tasa_cambio, monto_bs, metodo_pago, banco_emisor, banco_receptor, referencia, fecha_pago, fecha_aprobacion, placa, cliente_id, vehiculo_id, clientes(nombre, cedula_rif)')
    .eq('estado', 'aprobado')
    .order('fecha_aprobacion', { ascending: false })

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

  // Filtrar ingresos con saldo por reportar > 0
  const ingresosPendientes = (ingresosAprobados ?? [])
    .map(i => {
      const yaReportado = totalReportadoMap[i.id] ?? 0
      const saldo = Math.max(0, Number(i.monto) - yaReportado)
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
          <p className="text-oriental-gray text-xs mt-0.5">Ingresos aprobados con saldo pendiente de reportar</p>
        </div>
      </div>

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
            ${totalSaldo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            yaReportado: i.yaReportado,
            saldo: i.saldo,
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
