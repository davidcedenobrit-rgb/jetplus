import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ESTADOS_RECIBO_LABEL, METODOS_PAGO } from '@/lib/utils'
import { Plus, Search, FileBarChart2 } from 'lucide-react'
import BuscadorClienteURL from './BuscadorClienteURL'

const ROL_DIRECTOR = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; placa?: string; metodo?: string; cliente?: string; limit?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Cuántos registros mostrar. Empieza en 100 y crece con "Cargar más antiguos".
  const limitNum = Math.min(3000, Math.max(100, parseInt(params.limit ?? '100') || 100))

  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'
  const esDirector = ROL_DIRECTOR.includes(rol)

  // Filtro por cliente: busca ids que coincidan con nombre o cedula, luego filtra ingresos
  let clienteIdsFiltro: string[] | null = null
  if (params.cliente?.trim()) {
    const q = params.cliente.trim().replace(/[%_]/g, '')
    const { data: clientesMatch } = await supabase
      .from('clientes')
      .select('id')
      .or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
      .limit(200)
    clienteIdsFiltro = (clientesMatch ?? []).map(c => c.id)
  }

  let query = supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif)')
    .order('fecha_registro', { ascending: false })
    .limit(limitNum)

  if (params.estado) query = query.eq('estado', params.estado)
  if (params.placa) query = query.ilike('placa', `%${params.placa}%`)
  if (params.metodo) query = query.eq('metodo_pago', params.metodo)
  if (clienteIdsFiltro !== null) {
    if (clienteIdsFiltro.length === 0) {
      // Ninguno coincide; forzamos filtro vacío
      query = query.eq('cliente_id', '00000000-0000-0000-0000-000000000000')
    } else {
      query = query.in('cliente_id', clienteIdsFiltro)
    }
  }

  const { data: ingresos } = await query

  // Cargar total reportado a Vehimotors por cada ingreso
  const ingresoIds = (ingresos ?? []).map(i => i.id)
  const { data: reportesVMRaw } = ingresoIds.length > 0
    ? await supabase
        .from('reportes_vehimotors')
        .select('ingreso_id, monto_reportado')
        .in('ingreso_id', ingresoIds)
    : { data: [] }
  const totalReportadoVM: Record<string, number> = {}
  for (const r of reportesVMRaw ?? []) {
    totalReportadoVM[r.ingreso_id] = (totalReportadoVM[r.ingreso_id] ?? 0) + Number(r.monto_reportado)
  }

  // Estados de ingreso donde tiene sentido mostrar el badge VM (ya aprobados, no rechazados/anulados)
  const ESTADOS_REPORTABLES = new Set(['aprobado', 'enviado_carla', 'enviado_deposito', 'depositado', 'entregado_carla', 'reportado_vehimotors'])

  function getBadgeVM(ingreso: any): { label: string; cls: string } | null {
    if (!ESTADOS_REPORTABLES.has(ingreso.estado)) return null
    const reportado = totalReportadoVM[ingreso.id] ?? 0
    const total = Number(ingreso.monto)
    if (reportado <= 0) {
      return { label: 'Por reportar VM', cls: 'bg-amber-100 text-amber-800 border border-amber-200' }
    }
    if (reportado + 0.01 >= total) {
      return { label: 'Reportado VM', cls: 'bg-green-100 text-green-800 border border-green-200' }
    }
    return { label: `Parcial VM`, cls: 'bg-orange-100 text-orange-800 border border-orange-200' }
  }

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
    pendiente_anulacion: 'bg-orange-100 text-orange-800',
    anulado: 'bg-gray-200 text-gray-400',
  }

  // Filtros diferenciados por rol
  // Director ve el pipeline completo con label contextual para 'aprobado'
  // Leysdem/Mary ven solo los estados relevantes para su trabajo
  const filtros: { estado: string; label: string }[] = esDirector
    ? [
        { estado: '',                    label: 'Todos'             },
        { estado: 'pendiente_aprobacion',label: 'Pendiente'         },
        { estado: 'aprobado',            label: 'Aprobado (con José)'},
        { estado: 'enviado_carla',       label: 'Enviado Carla'     },
        { estado: 'enviado_deposito',    label: 'En depósito'       },
        { estado: 'depositado',          label: 'Depositado'        },
        { estado: 'entregado_carla',     label: 'Entregado Carla'   },
        { estado: 'reportado_vehimotors',label: 'Vehimotors'        },
        { estado: 'rechazado',           label: 'Rechazado'         },
        { estado: 'pendiente_anulacion', label: 'Pend. Anulación'  },
      ]
    : [
        { estado: '',                    label: 'Todos'             },
        { estado: 'pendiente_aprobacion',label: 'Pendiente'         },
        { estado: 'aprobado',            label: 'Aprobado'          },
        { estado: 'rechazado',           label: 'Rechazado'         },
        { estado: 'correccion_requerida',label: 'Corrección'        },
        { estado: 'pendiente_anulacion', label: 'Pend. Anulación'  },
      ]

  // Separación ingreso propio vs. fondos en custodia (Vehimotors / terceros)
  const usdVal = (i: any): number => i.moneda === 'VES'
    ? (i.tasa_cambio ? Number(i.monto) / Number(i.tasa_cambio) : 0)
    : Number(i.monto)
  const fmtUsd = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const totPropio = (ingresos ?? []).filter(i => ((i as any).titular_fondos ?? 'propio') === 'propio').reduce((s, i) => s + usdVal(i), 0)
  const totCustodia = (ingresos ?? []).filter(i => ((i as any).titular_fondos ?? 'propio') !== 'propio').reduce((s, i) => s + usdVal(i), 0)
  const titularBadge: Record<string, { label: string; cls: string }> = {
    vehimotors: { label: 'Vehimotors (custodia)', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
    tercero:    { label: 'Custodia tercero',      cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Ingresos</h1>
          <p className="text-oriental-gray text-sm mt-1">{ingresos?.length ?? 0} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/ingresos/reporte" className="btn-secondary flex items-center gap-2">
            <FileBarChart2 size={16} /> Reporte
          </Link>
          <Link href="/ingresos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Registrar ingreso
          </Link>
        </div>
      </div>

      {/* Separación ingreso propio vs. custodia */}
      {(totPropio > 0 || totCustodia > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-5 max-w-xl">
          <div className="card p-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-green-700">Ingreso propio (La Oriental)</p>
            <p className="text-xl font-black text-oriental-black">${fmtUsd(totPropio)}</p>
          </div>
          <div className={`card p-4 ${totCustodia > 0 ? 'border-amber-200 bg-amber-50/40' : ''}`}>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-700">En custodia (por entregar)</p>
            <p className="text-xl font-black text-oriental-black">${fmtUsd(totCustodia)}</p>
          </div>
        </div>
      )}

      {/* Buscador de cliente */}
      <div className="mb-4 max-w-xl">
        <BuscadorClienteURL />
        {params.cliente && (
          <p className="text-xs text-oriental-gray mt-1.5 ml-1">
            Filtrando por <span className="font-semibold text-oriental-black">"{params.cliente}"</span>
            {(ingresos?.length ?? 0) > 0
              ? ` · ${ingresos?.length} resultado${(ingresos?.length ?? 0) !== 1 ? 's' : ''}`
              : ' · sin coincidencias'}
          </p>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {filtros.map(({ estado, label }) => {
          const qs = new URLSearchParams()
          if (estado) qs.set('estado', estado)
          if (params.metodo) qs.set('metodo', params.metodo)
          if (params.placa) qs.set('placa', params.placa)
          if (params.cliente) qs.set('cliente', params.cliente)
          const href = qs.toString() ? `/ingresos?${qs.toString()}` : '/ingresos'
          return (
            <Link
              key={estado || 'todos'}
              href={href}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                params.estado === estado || (!params.estado && !estado)
                  ? 'bg-oriental-black text-white border-oriental-black'
                  : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Filtro método de pago */}
      <form method="GET" action="/ingresos" className="flex items-center gap-2 mb-6 flex-wrap">
        {params.estado && <input type="hidden" name="estado" value={params.estado} />}
        {params.placa && <input type="hidden" name="placa" value={params.placa} />}
        {params.cliente && <input type="hidden" name="cliente" value={params.cliente} />}
        <label className="text-xs font-semibold text-oriental-gray uppercase tracking-wider">Método:</label>
        <select
          name="metodo"
          defaultValue={params.metodo ?? ''}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-oriental-black focus:outline-none focus:border-oriental-red"
        >
          <option value="">Todos los métodos</option>
          {METODOS_PAGO.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-oriental-black text-white hover:bg-gray-800 transition-colors">
          Filtrar
        </button>
        {params.metodo && (() => {
          const qs = new URLSearchParams()
          if (params.estado) qs.set('estado', params.estado)
          if (params.placa) qs.set('placa', params.placa)
          if (params.cliente) qs.set('cliente', params.cliente)
          const href = qs.toString() ? `/ingresos?${qs.toString()}` : '/ingresos'
          return (
            <Link href={href} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-oriental-gray border border-gray-200 hover:bg-gray-50 transition-colors">
              Limpiar método
            </Link>
          )
        })()}
      </form>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-oriental-bg border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Recibo</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Concepto</th>
                <th className="text-right px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Monto</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Fecha pago</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Emisión</th>
                <th className="text-left px-4 py-3 font-semibold text-oriental-gray text-xs uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingresos?.map(ingreso => (
                <tr key={ingreso.id} className="hover:bg-oriental-bg/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-oriental-gray">{ingreso.numero_recibo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-oriental-black">{(ingreso as any).clientes?.nombre}</p>
                    <p className="text-xs text-oriental-gray">{(ingreso as any).clientes?.cedula_rif}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ingreso.placa ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{ingreso.concepto}</td>
                  <td className="px-4 py-3 text-right font-bold text-oriental-black">
                    {ingreso.moneda === 'VES' && ingreso.tasa_cambio
                      ? <span>
                          <span className="text-oriental-black">{formatCurrency(Number(ingreso.monto) / Number(ingreso.tasa_cambio))}</span>
                          <span className="block text-[10px] font-normal text-oriental-gray">Bs. {Number(ingreso.monto).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(ingreso.monto))*100)%100===0?0:2, maximumFractionDigits: 2 })}</span>
                        </span>
                      : formatCurrency(ingreso.monto, ingreso.moneda === 'VES' ? 'VES' : 'USD')
                    }
                  </td>
                  <td className="px-4 py-3 text-oriental-gray text-xs">{formatDate(ingreso.fecha_pago)}</td>
                  <td className="px-4 py-3 text-oriental-gray text-xs">
                    {ingreso.fecha_registro ? new Date(ingreso.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColors[ingreso.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ESTADOS_RECIBO_LABEL[ingreso.estado]}
                      </span>
                      {(ingreso as any).origen === 'portal_cliente' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          📱 Del cliente
                        </span>
                      )}
                      {(() => {
                        const badge = getBadgeVM(ingreso)
                        if (!badge) return null
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )
                      })()}
                      {(() => {
                        const tb = titularBadge[(ingreso as any).titular_fondos]
                        if (!tb) return null
                        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tb.cls}`}>{tb.label}</span>
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ingresos/${ingreso.id}`} className="text-oriental-red hover:text-oriental-red-dark font-medium text-xs">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {(!ingresos || ingresos.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Search size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-oriental-gray text-sm">No hay ingresos registrados</p>
                    <Link href="/ingresos/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                      Registrar el primero
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(ingresos?.length ?? 0) >= limitNum && (() => {
        const qs = new URLSearchParams()
        if (params.estado) qs.set('estado', params.estado)
        if (params.placa) qs.set('placa', params.placa)
        if (params.metodo) qs.set('metodo', params.metodo)
        if (params.cliente) qs.set('cliente', params.cliente)
        qs.set('limit', String(limitNum + 100))
        return (
          <div className="flex justify-center mt-4">
            <Link href={`/ingresos?${qs.toString()}`} scroll={false}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-oriental-gray hover:border-oriental-red hover:text-oriental-red transition-colors">
              Cargar más antiguos
            </Link>
          </div>
        )
      })()}
    </div>
  )
}
