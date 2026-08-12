import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, ESTADOS_RECIBO_LABEL } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Send, Landmark, Building2, Printer, FileText,
  User, Clock, Hash, CreditCard, BadgeCheck, ImageIcon
} from 'lucide-react'
import ActionButtons from './ActionButtons'
import ClienteContactButtons from './ClienteContactButtons'
import ComprobantesGallery from '@/components/ComprobantesGallery'
import SubirComprobante from './SubirComprobante'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('ingresos').select('numero_recibo').eq('id', id).single()
  return { title: data?.numero_recibo ?? 'Recibo — JETPLUS' }
}

export default async function IngresoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select(`
      id, numero_recibo, concepto, monto, moneda, monto_bs, tasa_cambio,
      metodo_pago, banco_emisor, banco_receptor, referencia, fecha_pago,
      estado, observaciones, placa, registrado_por, aprobado_por, titular_fondos,
      fecha_registro, fecha_aprobacion, enviado_carla_at, deposito_at,
      vehimotors_at, entregado_carla_at, confirmado_vehimotors_at,
      anulacion_motivo, anulacion_observaciones, anulacion_estado_previo,
      anulacion_solicitada_por, anulacion_solicitada_at, anulacion_rechazada_motivo,
      anulacion_resuelta_por, anulacion_resuelta_at,
      cliente_id, vehiculo_id, cuota_id, acuerdo_inicial_id, centro_costo_id,
      clientes(nombre, cedula_rif, telefono, correo, direccion, ciudad)
    `)
    .eq('id', id)
    .single()

  if (!ingreso) notFound()

  const { data: archivos } = await supabase
    .from('archivos')
    .select('*')
    .eq('ingreso_id', id)
    .order('created_at', { ascending: true })

  // Reportes a Vehimotors ya hechos de este ingreso
  const { data: reportesVM } = await supabase
    .from('reportes_vehimotors')
    .select('id, monto_reportado, moneda, estado, enviado_at, confirmado_at, observaciones, placa, proforma_vehimotors, clientes(nombre, cedula_rif)')
    .eq('ingreso_id', id)
    .order('enviado_at', { ascending: true })

  const totalReportadoVM = (reportesVM ?? []).reduce((s, r) => s + Number(r.monto_reportado), 0)

  // Cuotas aplicadas en este ingreso (para el recibo), con vehículo del crédito
  // Incluimos cuota_id para poder calcular el saldo AL MOMENTO del recibo (snapshot histórico)
  const { data: cuotasAplicadas } = await supabase
    .from('cuota_ingresos')
    .select('cuotas!inner(id, numero_cuota, monto, monto_pagado, estado, fecha_vencimiento, concepto, credito_id, creditos(plan_tipo, vehiculo_id, placa, vehiculos(marca, modelo, placa, proforma_vehimotors))), monto_aplicado')
    .eq('ingreso_id', id)

  // Para calcular el saldo AL MOMENTO del recibo, necesitamos saber cuánto se aplicó a cada cuota
  // antes de este ingreso (por otros recibos anteriores).
  const cuotaIdsAplicadas = (cuotasAplicadas ?? [])
    .map((ci: any) => ci.cuotas?.id)
    .filter(Boolean)
  // Pagos con recibo registrados DESPUÉS de este, para reconstruir el saldo AL
  // MOMENTO de este recibo a partir de lo realmente pagado hoy (monto_pagado).
  const pagosPosterioresPorCuota: Record<string, number> = {}
  if (cuotaIdsAplicadas.length > 0) {
    const { data: pagosHist } = await supabase
      .from('cuota_ingresos')
      .select('cuota_id, monto_aplicado, ingresos!inner(id, fecha_registro, estado)')
      .in('cuota_id', cuotaIdsAplicadas)

    const fechaActual = ingreso.fecha_registro
    for (const p of (pagosHist ?? []) as any[]) {
      const estIng = p.ingresos?.estado
      if (estIng === 'anulado' || estIng === 'rechazado') continue
      if (p.ingresos?.id === id) continue // no cuentes este mismo
      if (p.ingresos?.fecha_registro && p.ingresos.fecha_registro > fechaActual) {
        pagosPosterioresPorCuota[p.cuota_id] = (pagosPosterioresPorCuota[p.cuota_id] ?? 0) + Number(p.monto_aplicado)
      }
    }
  }

  // Vehículos únicos afectados por las cuotas aplicadas (para el resumen del recibo)
  const vehiculosCuotas: { id?: string; marca: string; modelo: string; placa: string | null; proforma: string | null }[] = []
  const vistos = new Set<string>()
  for (const ci of (cuotasAplicadas ?? []) as any[]) {
    const v = ci?.cuotas?.creditos?.vehiculos
    const placa = v?.placa ?? ci?.cuotas?.creditos?.placa ?? null
    if (!v) continue
    const key = `${v.marca}|${v.modelo}|${placa ?? ''}|${v.proforma_vehimotors ?? ''}`
    if (vistos.has(key)) continue
    vistos.add(key)
    vehiculosCuotas.push({
      marca: v.marca,
      modelo: v.modelo,
      placa,
      proforma: v.proforma_vehimotors ?? null,
    })
  }

  // Vehículo vinculado
  const { data: vehiculo } = ingreso.vehiculo_id
    ? await supabase
        .from('vehiculos')
        .select('marca, modelo, version, anio, placa, color')
        .eq('id', ingreso.vehiculo_id)
        .single()
    : { data: null }

  // Estado de cuenta actual del vehículo (para mostrar en el recibo)
  let creditosVehiculo: any[] = []
  let cuotasVehiculo: any[] = []
  if (ingreso.vehiculo_id) {
    const { data: creds } = await supabase
      .from('creditos')
      .select('id, plan_tipo, monto_financiado, saldo, num_cuotas')
      .eq('vehiculo_id', ingreso.vehiculo_id)
      .order('plan_tipo')
    creditosVehiculo = creds ?? []
    if (creditosVehiculo.length > 0) {
      const { data: cuotas } = await supabase
        .from('cuotas')
        .select('id, estado, credito_id')
        .in('credito_id', creditosVehiculo.map((c: any) => c.id))
      cuotasVehiculo = cuotas ?? []
    }
  }
  const ecTotalFinanciado = creditosVehiculo.reduce((s: number, c: any) => s + Number(c.monto_financiado ?? 0), 0)
  const ecTotalSaldo      = creditosVehiculo.reduce((s: number, c: any) => s + Number(c.saldo ?? 0), 0)
  const ecTotalPagado     = ecTotalFinanciado - ecTotalSaldo
  const ecPct             = ecTotalFinanciado > 0 ? Math.round((ecTotalPagado / ecTotalFinanciado) * 100) : 0
  const ecPagadas         = cuotasVehiculo.filter((c: any) => c.estado === 'pagada').length
  const ecPendientes      = cuotasVehiculo.filter((c: any) => c.estado === 'pendiente').length
  const ecVencidas        = cuotasVehiculo.filter((c: any) => c.estado === 'vencida').length

  // Acuerdo de pago (si este ingreso vino de uno)
  let acuerdoResumen: {
    montoAcordado: number
    montoPagado: number
    montoPendiente: number
    pct: number
    fechaLimite: string | null
    estado: string | null
  } | null = null
  if (ingreso.acuerdo_inicial_id) {
    const { data: acuerdo } = await supabase
      .from('acuerdos_inicial')
      .select('monto_acordado, fecha_limite, estado')
      .eq('id', ingreso.acuerdo_inicial_id)
      .single()
    if (acuerdo) {
      // Pagado del acuerdo AL MOMENTO de este recibo: suma en USD de los pagos
      // no anulados registrados hasta este recibo (los pagos en Bs se convierten
      // con su tasa). Los pagos posteriores a este recibo no cuentan, para que
      // cada recibo refleje el estado que tenía cuando se emitió.
      const { data: pagosAcuerdo } = await supabase
        .from('ingresos')
        .select('id, monto, moneda, tasa_cambio, estado, fecha_registro')
        .eq('acuerdo_inicial_id', ingreso.acuerdo_inicial_id)
      const usdDe = (p: any) => {
        const m = Number(p.monto ?? 0)
        if (p.moneda === 'VES') { const t = Number(p.tasa_cambio ?? 0); return t > 0 ? m / t : 0 }
        return m
      }
      const fechaEste = ingreso.fecha_registro
      const montoPagado = (pagosAcuerdo ?? [])
        .filter((p: any) => p.estado !== 'anulado' && p.estado !== 'rechazado')
        .filter((p: any) => p.id === id || !fechaEste || (p.fecha_registro && p.fecha_registro <= fechaEste))
        .reduce((s: number, p: any) => s + usdDe(p), 0)
      const montoAcordado = Number(acuerdo.monto_acordado ?? 0)
      const montoPendiente = Math.max(0, montoAcordado - montoPagado)
      const pct = montoAcordado > 0 ? Math.round((montoPagado / montoAcordado) * 100) : 0
      acuerdoResumen = {
        montoAcordado,
        montoPagado,
        montoPendiente,
        pct,
        fechaLimite: acuerdo.fecha_limite ?? null,
        estado: acuerdo.estado ?? null,
      }
    }
  }

  const cliente = (ingreso as any).clientes

  const estadoColors: Record<string, string> = {
    registrado: 'bg-gray-100 text-gray-700',
    pendiente_aprobacion: 'bg-yellow-100 text-yellow-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    correccion_requerida: 'bg-orange-100 text-orange-800',
    enviado_carla: 'bg-purple-100 text-purple-800',
    enviado_deposito: 'bg-blue-100 text-blue-800',
    depositado: 'bg-emerald-100 text-emerald-800',
    entregado_carla: 'bg-teal-100 text-teal-800',
    reportado_vehimotors: 'bg-indigo-100 text-indigo-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      {/* CSS de impresión: forzar A4, escalar para que quepa en una hoja */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0.8cm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #recibo-imprimible { font-size: 11px !important; }
          #recibo-imprimible .p-6 { padding: 12px !important; }
          #recibo-imprimible .p-4 { padding: 10px !important; }
          #recibo-imprimible .p-3 { padding: 8px !important; }
          #recibo-imprimible .space-y-5 > * + * { margin-top: 10px !important; }
          #recibo-imprimible .space-y-3 > * + * { margin-top: 6px !important; }
          #recibo-imprimible .mb-4 { margin-bottom: 8px !important; }
          #recibo-imprimible .mb-5 { margin-bottom: 10px !important; }
          #recibo-imprimible .text-3xl { font-size: 20px !important; }
          #recibo-imprimible .text-2xl { font-size: 16px !important; }
          #recibo-imprimible .h-14 { height: 44px !important; }
          #recibo-imprimible .h-24 { height: 64px !important; }
          #recibo-imprimible .pb-24 { padding-bottom: 64px !important; }
          #recibo-imprimible .pt-5 { padding-top: 12px !important; }
          #recibo-imprimible .py-5 { padding-top: 10px !important; padding-bottom: 10px !important; }
          #recibo-imprimible .gap-6 { gap: 12px !important; }
          #recibo-imprimible .gap-4 { gap: 8px !important; }
          #recibo-imprimible .rounded-xl { border-radius: 8px !important; }
          #recibo-imprimible table { font-size: 10px !important; }
          #recibo-imprimible th, #recibo-imprimible td { padding: 5px 8px !important; }
        }
      `}</style>

      {/* Header — oculto al imprimir */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link href="/ingresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-oriental-black">{ingreso.numero_recibo}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
              {ESTADOS_RECIBO_LABEL[ingreso.estado]}
            </span>
            {(ingreso as any).titular_fondos && (ingreso as any).titular_fondos !== 'propio' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {(ingreso as any).titular_fondos === 'vehimotors' ? 'Vehimotors (custodia)' : 'Custodia tercero'}
              </span>
            )}
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">Registrado el {formatDate(ingreso.fecha_registro)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── RECIBO IMPRIMIBLE ── */}
          <div id="recibo-imprimible" className="card overflow-hidden">

            {/* Cabecera del recibo */}
            <div className="bg-white border-b-2 border-oriental-red px-6 py-5 flex items-start justify-between">
              <div>
                {/* Logo real */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-jetplus.jpg"
                  alt="JETPLUS"
                  className="h-14 w-auto object-contain"
                  style={{ maxWidth: 220 }}
                />
                <p className="text-gray-600 text-[10px] font-semibold mt-1.5">RIF: J-50372874-4</p>
                <p className="text-gray-500 text-[10px] mt-0.5 leading-relaxed">
                  Av. Ugarte Pelayo, Centro Profesional David, Qta. Galpón Nro. S/N<br />
                  Sector Centro, Maturín, Monagas. C.P. 6201
                </p>
                <p className="text-gray-400 text-[10px] mt-0.5">Concesionario Oficial MG & MAXUS</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">N° de Recibo</p>
                <p className="text-oriental-red font-mono font-black text-2xl mt-0.5">{ingreso.numero_recibo}</p>
                <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ESTADOS_RECIBO_LABEL[ingreso.estado]}
                </div>
                <p className="text-gray-400 text-[10px] mt-1">{formatDate(ingreso.fecha_pago)}</p>
              </div>
            </div>

            {/* Cuerpo del recibo */}
            <div className="p-6 space-y-5">

              {/* Fila 1: Cliente + Contacto */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Cliente</p>
                  <p className="font-bold text-oriental-black text-sm">{cliente?.nombre ?? '—'}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">{cliente?.cedula_rif ?? '—'}</p>
                  {cliente?.ciudad && <p className="text-xs text-oriental-gray">{cliente.ciudad}</p>}
                </div>
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Contacto</p>
                  <p className="text-xs text-oriental-black">{cliente?.telefono ?? '—'}</p>
                  <p className="text-xs text-oriental-gray mt-0.5">{cliente?.correo ?? '—'}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Fila 2: Vehículo(s) */}
              {vehiculosCuotas.length > 1 ? (
                // Múltiples vehículos afectados por las cuotas aplicadas
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-2">
                    Vehículos ({vehiculosCuotas.length})
                  </p>
                  <div className="space-y-2">
                    {vehiculosCuotas.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-oriental-bg/50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-bold text-oriental-black">{v.marca} {v.modelo}</p>
                          {v.proforma && (
                            <p className="text-[11px] text-indigo-700 font-mono font-semibold">📄 {v.proforma}</p>
                          )}
                        </div>
                        <span className="font-mono font-black text-oriental-black text-sm tracking-widest">
                          {v.placa ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Un solo vehículo (comportamiento clásico)
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Vehículo</p>
                    {vehiculo ? (
                      <div>
                        <p className="text-sm font-bold text-oriental-black">
                          {vehiculo.marca} {vehiculo.modelo}
                          {vehiculo.anio && <span className="font-normal text-oriental-gray ml-1">{vehiculo.anio}</span>}
                        </p>
                        {vehiculo.version && <p className="text-xs text-oriental-gray">{vehiculo.version}</p>}
                      </div>
                    ) : vehiculosCuotas[0] ? (
                      <div>
                        <p className="text-sm font-bold text-oriental-black">{vehiculosCuotas[0].marca} {vehiculosCuotas[0].modelo}</p>
                        {vehiculosCuotas[0].proforma && (
                          <p className="text-[11px] text-indigo-700 font-mono font-semibold">📄 {vehiculosCuotas[0].proforma}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-oriental-gray">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Placa</p>
                    <p className="font-mono font-black text-oriental-black text-base tracking-widest">
                      {ingreso.placa ?? vehiculo?.placa ?? vehiculosCuotas[0]?.placa ?? '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Resumen del acuerdo de pago (si aplica) */}
              {acuerdoResumen && (
                <>
                  <div className="border-t border-gray-100" />
                  <div className="rounded-xl border-2 border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                        Resumen del acuerdo de pago
                      </p>
                      {acuerdoResumen.fechaLimite && (
                        <p className="text-[10px] text-blue-700">
                          Fecha límite: <span className="font-semibold">{formatDate(acuerdoResumen.fechaLimite)}</span>
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[9px] text-oriental-gray uppercase font-bold">Acordado</p>
                        <p className="text-lg font-black text-oriental-black">
                          USD {acuerdoResumen.montoAcordado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(acuerdoResumen.montoAcordado)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-oriental-gray uppercase font-bold">Pagado</p>
                        <p className="text-lg font-black text-green-700">
                          USD {acuerdoResumen.montoPagado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(acuerdoResumen.montoPagado)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-oriental-gray uppercase font-bold">Pendiente</p>
                        <p className="text-lg font-black text-oriental-red">
                          USD {acuerdoResumen.montoPendiente.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(acuerdoResumen.montoPendiente)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-oriental-gray mb-1">
                        <span>Progreso</span>
                        <span className="font-bold text-blue-800">{acuerdoResumen.pct}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border border-blue-100">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, acuerdoResumen.pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gray-100" />

              {/* Fila 3: Concepto + Fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Concepto</p>
                  <p className="text-sm font-semibold text-oriental-black">{ingreso.concepto}</p>
                </div>
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1.5">Fecha de pago</p>
                  <p className="text-sm font-semibold text-oriental-black">{formatDate(ingreso.fecha_pago)}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Cuotas aplicadas (solo si las hay) */}
              {(cuotasAplicadas ?? []).length > 0 && (
                <>
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-2">Cuotas aplicadas</p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="print-bg-gray bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-semibold text-oriental-gray">Cuota</th>
                            <th className="text-left px-3 py-2 font-semibold text-oriental-gray">Plan</th>
                            <th className="text-left px-3 py-2 font-semibold text-oriental-gray">Vehículo / Placa</th>
                            <th className="text-left px-3 py-2 font-semibold text-oriental-gray">Vencimiento</th>
                            <th className="text-right px-3 py-2 font-semibold text-oriental-gray">Monto cuota</th>
                            <th className="text-right px-3 py-2 font-semibold text-oriental-gray">Abonado este recibo</th>
                            <th className="text-right px-3 py-2 font-semibold text-oriental-gray">Saldo cuota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cuotasAplicadas ?? []).map((ci: any, idx: number) => {
                            const cuota = ci.cuotas
                            const planTipo = cuota?.creditos?.plan_tipo
                            const planNombre =
                              planTipo === 'inicial_la_oriental' ? 'Jetplus' :
                              planTipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
                              planTipo === 'asegurate_500' ? 'Asegúrate $500' :
                              planTipo === 'credito_40_60' ? '40/60 Vehimotors' :
                              planTipo === 'cuota_especial' ? 'Cuota especial' : 'Crédito'
                            const vehCuota = cuota?.creditos?.vehiculos
                            const placaCuota = vehCuota?.placa ?? cuota?.creditos?.placa ?? null
                            const montoTotal = Number(cuota?.monto ?? 0)
                            const aplicado = Number(ci.monto_aplicado)
                            // Saldo de la cuota AL MOMENTO del recibo. Parte del saldo real
                            // de HOY (monto - monto_pagado, que incluye pagos hechos sin
                            // recibo, p.ej. al crear el crédito) y le suma los pagos con
                            // recibo posteriores, para que un recibo viejo reimpreso muestre
                            // el saldo que tenía en su momento.
                            const pagadoReal = Number(cuota?.monto_pagado ?? 0)
                            const pagosPosteriores = pagosPosterioresPorCuota[cuota?.id] ?? 0
                            const saldoCuota = Math.max(0, montoTotal - pagadoReal + pagosPosteriores)
                            return (
                              <tr key={idx} className="border-b border-gray-100 last:border-0">
                                <td className="px-3 py-2 font-semibold text-oriental-black">#{cuota?.numero_cuota ?? '—'}</td>
                                <td className="px-3 py-2 text-oriental-gray">{planNombre}</td>
                                <td className="px-3 py-2">
                                  {vehCuota ? (
                                    <>
                                      <p className="text-oriental-black font-semibold text-[11px]">{vehCuota.marca} {vehCuota.modelo}</p>
                                      <p className="font-mono text-oriental-gray text-[10px]">
                                        {placaCuota ?? '—'}
                                        {vehCuota.proforma_vehimotors && <span className="ml-1 text-indigo-600">· {vehCuota.proforma_vehimotors}</span>}
                                      </p>
                                    </>
                                  ) : (
                                    <span className="text-oriental-gray">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-oriental-gray">
                                  {cuota?.fecha_vencimiento
                                    ? new Date(cuota.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-oriental-gray">
                                  ${montoTotal.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(montoTotal)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-oriental-black">
                                  ${aplicado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(aplicado)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`px-3 py-2 text-right font-bold ${saldoCuota > 0 ? 'text-oriental-red' : 'text-green-600'}`}>
                                  ${saldoCuota.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(saldoCuota)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="border-t border-gray-100" />
                </>
              )}

              {/* Monto recibido */}
              <div className="print-bg-gray bg-oriental-bg rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold">Monto recibido</p>
                  <p className="text-xs text-oriental-gray mt-0.5">
                    {ingreso.moneda === 'USD' ? 'Dólares americanos' : ingreso.moneda === 'USDT' ? 'Tether USD' : 'Bolívares'}
                  </p>
                </div>
                <p className="text-3xl font-black text-oriental-black">{formatCurrency(ingreso.monto, ingreso.moneda)}</p>
              </div>

              {/* Tasa de cambio (solo VES) */}
              {ingreso.moneda === 'VES' && ingreso.tasa_cambio && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-600 uppercase tracking-wider font-bold">Tasa de cambio</p>
                    <p className="text-xs text-blue-700 mt-0.5">Equivalente en USD: ~{formatCurrency(ingreso.monto / ingreso.tasa_cambio, 'USD')}</p>
                  </div>
                  <p className="text-xl font-black text-blue-800">{Number(ingreso.tasa_cambio).toFixed(2)} Bs/$</p>
                </div>
              )}

              <div className="border-t border-gray-100" />

              {/* Forma de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1">Forma de pago</p>
                  <p className="text-sm font-semibold text-oriental-black">{ingreso.metodo_pago}</p>
                </div>
                <div>
                  <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1">N° Referencia</p>
                  <p className="font-mono text-sm font-bold text-oriental-black">{ingreso.referencia ?? '—'}</p>
                </div>
                {ingreso.banco_emisor && (
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1">Banco emisor</p>
                    <p className="text-sm text-oriental-black">{ingreso.banco_emisor}</p>
                  </div>
                )}
                {ingreso.banco_receptor && (
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1">Banco receptor</p>
                    <p className="text-sm text-oriental-black">{ingreso.banco_receptor}</p>
                  </div>
                )}
              </div>

              {ingreso.observaciones && (
                <>
                  <div className="border-t border-gray-100" />
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-1">Observaciones</p>
                    <p className="text-sm text-gray-700">{ingreso.observaciones}</p>
                  </div>
                </>
              )}

              {/* ── Estado de cuenta tras este pago ── */}
              {creditosVehiculo.length > 0 && (
                <>
                  <div className="border-t-2 border-dashed border-gray-200" />
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-3 bg-oriental-red rounded-full" />
                      Estado de cuenta — al día de este recibo
                    </p>

                    {/* Layout horizontal: resumen + desglose lado a lado */}
                    <div className="grid grid-cols-2 gap-3">

                      {/* Columna izquierda: Resumen total */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                        <p className="text-[9px] font-bold text-oriental-gray uppercase tracking-wider mb-2">Resumen total</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-oriental-gray">Total financiado</span>
                            <span className="font-semibold text-oriental-black">USD {ecTotalFinanciado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(ecTotalFinanciado)*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-oriental-gray">Ya pagado</span>
                            <span className="font-semibold text-green-700">USD {ecTotalPagado.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(ecTotalPagado)*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-oriental-gray">Saldo pendiente</span>
                            <span className="font-bold text-oriental-red">USD {ecTotalSaldo.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(ecTotalSaldo)*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[9px] text-oriental-gray mb-0.5">
                            <span>Progreso</span><span className="font-semibold">{ecPct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${ecPct}%` }} />
                          </div>
                        </div>
                        {/* Contadores */}
                        <div className="flex gap-1.5 mt-2">
                          <div className="flex-1 bg-green-50 rounded px-1 py-1 text-center border border-green-100">
                            <p className="text-xs font-extrabold text-green-700">{ecPagadas}</p>
                            <p className="text-[9px] text-green-600">Pagadas</p>
                          </div>
                          <div className="flex-1 bg-yellow-50 rounded px-1 py-1 text-center border border-yellow-100">
                            <p className="text-xs font-extrabold text-yellow-700">{ecPendientes}</p>
                            <p className="text-[9px] text-yellow-600">Pendientes</p>
                          </div>
                          <div className={`flex-1 rounded px-1 py-1 text-center border ${ecVencidas > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-xs font-extrabold ${ecVencidas > 0 ? 'text-red-700' : 'text-gray-400'}`}>{ecVencidas}</p>
                            <p className={`text-[9px] ${ecVencidas > 0 ? 'text-red-500' : 'text-gray-400'}`}>Vencidas</p>
                          </div>
                        </div>
                      </div>

                      {/* Columna derecha: Desglose por financiamiento */}
                      <div>
                        <p className="text-[9px] font-bold text-oriental-gray uppercase tracking-wider mb-2">Desglose por financiamiento</p>
                        <div className="space-y-1.5">
                          {creditosVehiculo.map((c: any) => {
                            const cuotasCred = cuotasVehiculo.filter((q: any) => q.credito_id === c.id)
                            const pagadasCred = cuotasCred.filter((q: any) => q.estado === 'pagada').length
                            const planLabel =
                              c.plan_tipo === 'inicial_la_oriental' ? 'Jetplus' :
                              c.plan_tipo === 'financiamiento_vehimotors' ? 'Vehimotors' :
                              c.plan_tipo === 'asegurate_500' ? 'Asegúrate $500' :
                              c.plan_tipo === 'credito_40_60' ? '40/60 Vehimotors' :
                              c.plan_tipo === 'cuota_especial' ? 'Cuota especial' : 'Crédito'
                            const planBg = c.plan_tipo === 'inicial_la_oriental'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : c.plan_tipo === 'financiamiento_vehimotors'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : c.plan_tipo === 'asegurate_500'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : c.plan_tipo === 'credito_40_60'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                            return (
                              <div key={c.id} className={`flex items-center justify-between p-2 rounded-lg border ${planBg}`}>
                                <div>
                                  <p className="text-[11px] font-bold">{planLabel}</p>
                                  <p className="text-[9px] opacity-70">{pagadasCred}/{cuotasCred.length} cuotas</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] opacity-60">Saldo</p>
                                  <p className="text-[11px] font-bold">USD {Number(c.saldo ?? 0).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(c.saldo ?? 0))*100)%100===0?0:2, maximumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Firmas */}
              <div className="border-t border-gray-100 pt-5 mt-2">
                <div className="grid grid-cols-2 gap-8">
                  {/* Sello empresa */}
                  <div className="text-center">
                    <div className="relative h-24 flex items-center justify-center mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/sello-jetplus.jpeg"
                        alt="Sello JETPLUS Automotors"
                        className="h-24 w-auto object-contain"
                        style={{ mixBlendMode: 'multiply', opacity: 0.85 }}
                      />
                    </div>
                    <div className="border-b-2 border-gray-300 mb-2" />
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-semibold">Sello / Firma empresa</p>
                    {ingreso.aprobado_por && ingreso.fecha_aprobacion && (
                      <p className="text-[10px] text-green-700 font-medium mt-1">
                        ✓ Aprobado {formatDate(ingreso.fecha_aprobacion)}
                      </p>
                    )}
                  </div>
                  {/* Firma cliente */}
                  <div className="text-center">
                    <div className="pb-24 mb-1" />
                    <div className="border-b-2 border-gray-300 mb-2" />
                    <p className="text-[10px] text-oriental-gray uppercase tracking-wider font-semibold">Firma del cliente</p>
                    <p className="text-[10px] text-oriental-gray mt-1">{cliente?.cedula_rif ?? ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del recibo */}
            <div className="print-bg-gray bg-oriental-bg border-t border-gray-200 px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] text-oriental-gray">JETPLUS · RIF: J-50372874-4</p>
              <p className="text-[10px] text-oriental-gray font-mono">{ingreso.numero_recibo}</p>
            </div>
          </div>
        </div>

        {/* Right: Actions — oculto al imprimir */}
        <div className="space-y-4 print:hidden">
          <ActionButtons
            ingresoId={ingreso.id}
            estado={ingreso.estado}
            monto={ingreso.monto}
            moneda={ingreso.moneda}
            numeroRecibo={ingreso.numero_recibo}
            rol={rol}
            metodoPago={ingreso.metodo_pago}
            clienteOriginal={cliente ? { id: ingreso.cliente_id, nombre: cliente.nombre, cedula_rif: cliente.cedula_rif ?? null } : null}
            totalYaReportadoVM={totalReportadoVM}
            centroCostoActual={(ingreso as any).centro_costo_id ?? null}
          />

          {/* ── Enviar al cliente ────────────────────────────────── */}
          <ClienteContactButtons
            ingresoId={ingreso.id}
            clienteNombre={cliente?.nombre ?? ''}
            clienteCorreo={cliente?.correo ?? null}
            clienteTelefono={cliente?.telefono ?? null}
            numeroRecibo={ingreso.numero_recibo}
            monto={Number(ingreso.monto)}
            moneda={ingreso.moneda}
            concepto={ingreso.concepto}
            fechaPago={ingreso.fecha_pago}
            metodoPago={ingreso.metodo_pago}
            referencia={ingreso.referencia ?? null}
            rol={rol}
          />

          {/* ── Historial de reportes a Vehimotors ────────────────── */}
          {(reportesVM ?? []).length > 0 && (
            <div className="card p-5 border border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <Building2 size={14} className="text-indigo-600" />
                  Reportes a Vehimotors ({(reportesVM ?? []).length})
                </h3>
                <div className="text-right">
                  <p className="text-[10px] text-indigo-600 uppercase tracking-wider">Total reportado</p>
                  <p className="text-sm font-extrabold text-indigo-900">
                    ${totalReportadoVM.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(totalReportadoVM)*100)%100===0?0:2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {(reportesVM ?? []).map((r: any) => (
                  <div key={r.id} className="bg-indigo-50/50 rounded-lg px-3 py-2.5 border border-indigo-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-oriental-black truncate">{r.clientes?.nombre ?? '—'}</p>
                        <p className="text-[11px] text-oriental-gray font-mono">
                          {r.placa ? `${r.placa} · ` : ''}{r.proforma_vehimotors ?? '—'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-indigo-900">
                          ${Number(r.monto_reportado).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(r.monto_reportado))*100)%100===0?0:2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${
                          r.estado === 'confirmado' ? 'text-green-700' :
                          r.estado === 'rechazado' ? 'text-red-700' : 'text-amber-700'
                        }`}>
                          {r.estado === 'confirmado' ? '✓ Confirmado' :
                           r.estado === 'rechazado' ? '✗ Rechazado' : '⏱ En espera'}
                        </p>
                      </div>
                    </div>
                    {r.observaciones && (
                      <p className="text-[11px] text-oriental-gray mt-1.5 italic">{r.observaciones}</p>
                    )}
                    <p className="text-[10px] text-oriental-gray mt-1">
                      {new Date(r.enviado_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              {totalReportadoVM < Number(ingreso.monto) && (
                <div className="mt-3 pt-3 border-t border-indigo-100 flex justify-between items-center">
                  <span className="text-xs font-semibold text-amber-700">Saldo por reportar</span>
                  <span className="text-sm font-bold text-amber-700">
                    ${(Number(ingreso.monto) - totalReportadoVM).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Enviado a Carla: comprobante y observaciones ─────── */}
          {ingreso.estado === 'enviado_carla' && (
            <div className="card p-5 space-y-4 border border-purple-200">
              <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <Send size={14} className="text-purple-500" />
                Enviado por José Rojas
              </h3>
              {ingreso.enviado_carla_at && (
                <p className="text-[11px] text-purple-500">
                  {new Date(ingreso.enviado_carla_at).toLocaleString('es-VE', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
              {ingreso.observaciones && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-[10px] text-purple-500 uppercase tracking-wider font-bold mb-1">Observaciones</p>
                  <p className="text-sm text-purple-900">{ingreso.observaciones}</p>
                </div>
              )}
              {(archivos ?? []).filter((a: any) => a.tipo !== 'comprobante_deposito').length > 0 && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-[10px] text-purple-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                    <FileText size={11} /> Comprobantes
                  </p>
                  <div className="space-y-2">
                    {(archivos ?? [])
                      .filter((a: any) => a.tipo !== 'comprobante_deposito')
                      .map((a: any) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-purple-700 hover:text-purple-900 hover:underline font-medium"
                        >
                          <ImageIcon size={12} className="flex-shrink-0" />
                          {a.nombre ?? 'Ver comprobante'}
                        </a>
                      ))}
                  </div>
                </div>
              )}
              {!ingreso.observaciones && (archivos ?? []).filter((a: any) => a.tipo !== 'comprobante_deposito').length === 0 && (
                <p className="text-xs text-purple-400 italic">Sin observaciones ni comprobantes adjuntos</p>
              )}
            </div>
          )}

          {/* ── Seguimiento de depósito ───────────────────────────── */}
          {(ingreso as any).enviado_deposito_responsable && (
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-bold text-oriental-black flex items-center gap-2">
                <Landmark size={15} className="text-oriental-gray" />
                Seguimiento del depósito
              </h3>

              {/* Datos del envío (José registró) */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Enviado a depositar</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <User size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Responsable</p>
                      <p className="text-sm font-semibold text-blue-900">{(ingreso as any).enviado_deposito_responsable}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Enviado el</p>
                      <p className="text-sm font-semibold text-blue-900">
                        {ingreso.deposito_at
                          ? new Date(ingreso.deposito_at).toLocaleString('es-VE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos del depósito confirmado (Ari llenó) */}
              {(ingreso as any).deposito_referencia ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-emerald-600" />
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Depósito confirmado</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="flex items-center gap-2">
                      <Hash size={13} className="text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold">N° Referencia</p>
                        <p className="text-sm font-mono font-bold text-emerald-900">{(ingreso as any).deposito_referencia}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={13} className="text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold">Banco receptor</p>
                        <p className="text-sm font-semibold text-emerald-900">{(ingreso as any).deposito_banco}</p>
                      </div>
                    </div>
                    {(ingreso as any).depositado_at && (
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold">Confirmado el</p>
                          <p className="text-sm font-semibold text-emerald-900">
                            {new Date((ingreso as any).depositado_at).toLocaleString('es-VE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Comprobante del depósito */}
                  {(archivos ?? []).filter((a: any) => a.tipo === 'comprobante_deposito').length > 0 && (
                    <div className="pt-2 border-t border-emerald-100">
                      <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                        <ImageIcon size={11} /> Comprobante de depósito
                      </p>
                      <div className="space-y-1.5">
                        {(archivos ?? [])
                          .filter((a: any) => a.tipo === 'comprobante_deposito')
                          .map((a: any) => (
                            <a
                              key={a.id}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                            >
                              <FileText size={12} />
                              {a.nombre ?? 'Ver comprobante'}
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Pendiente confirmación del depósito</p>
                  <p className="text-[11px] text-amber-500 mt-0.5">El responsable debe cargar la referencia y el banco</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-oriental-black mb-4">Historial</h3>
            <div className="space-y-3">
              <TimelineItem label="Registrado" date={ingreso.fecha_registro} active />
              <TimelineItem label="Aprobado" date={ingreso.fecha_aprobacion} active={!!ingreso.fecha_aprobacion} />
              <TimelineItem label="Enviado a Carla" date={ingreso.enviado_carla_at} active={!!ingreso.enviado_carla_at} />
              <TimelineItem label="Enviado a depositar" date={ingreso.deposito_at} active={!!ingreso.deposito_at} />
              <TimelineItem label="Depositado" date={(ingreso as any).depositado_at} active={!!(ingreso as any).depositado_at} />
              <TimelineItem label="Entregado a Carla" date={(ingreso as any).entregado_carla_at} active={!!(ingreso as any).entregado_carla_at} highlight />
              <TimelineItem label="Reportado Vehimotors" date={ingreso.vehimotors_at} active={!!ingreso.vehimotors_at} />
            </div>
          </div>

          <ComprobantesGallery archivos={(archivos ?? []).filter((a: any) => a.tipo !== 'comprobante_deposito')} />
          {rol !== 'cliente' && (
            <SubirComprobante
              ingresoId={ingreso.id}
              tieneComprobantes={(archivos ?? []).some((a: any) => a.tipo !== 'comprobante_deposito')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ label, date, active, highlight }: { label: string; date?: string | null; active: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? (highlight ? 'bg-teal-500' : 'bg-oriental-red') : 'bg-gray-200'}`} />
      <div className="flex-1">
        <p className={`text-sm ${active ? (highlight ? 'text-teal-700 font-semibold' : 'text-oriental-black font-medium') : 'text-gray-400'}`}>{label}</p>
      </div>
      {date && <p className="text-[11px] text-oriental-gray">{formatDate(date)}</p>}
    </div>
  )
}
