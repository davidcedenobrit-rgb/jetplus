import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CreditCard, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'

function fmtMoney(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string | null) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pagada: { label: 'Pagada', bg: 'bg-green-50', color: 'text-green-800' },
  pendiente: { label: 'Pendiente', bg: 'bg-gray-100', color: 'text-gray-700' },
  vencida: { label: 'Vencida', bg: 'bg-red-100', color: 'text-red-800' },
  abono_parcial: { label: 'Abono parcial', bg: 'bg-orange-100', color: 'text-orange-800' },
}

const PLAN_LABEL: Record<string, string> = {
  inicial_la_oriental: 'La Oriental',
  financiamiento_vehimotors: 'Vehimotors',
  cuota_especial: 'Cuota Especial',
  asegurate_500: 'Asegúrate $500',
  credito_40_60: '40/60 Vehimotors',
}

export default async function MiCreditoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin.from('cliente_cuentas').select('cliente_id').eq('user_id', user.id).single()
  if (!cuenta) redirect('/portal/login')

  const { data: creditos } = await admin
    .from('creditos')
    .select('*, vehiculos(marca, modelo, placa)')
    .eq('cliente_id', cuenta.cliente_id)
    .order('created_at', { ascending: false })

  const hoy = new Date().toISOString().split('T')[0]
  const creditosIds = (creditos ?? []).map(c => c.id)
  const { data: cuotas } = creditosIds.length ? await admin
    .from('cuotas')
    .select('*')
    .in('credito_id', creditosIds)
    .order('numero_cuota', { ascending: true })
  : { data: [] as any[] }

  const cuotasPorCredito: Record<string, any[]> = {}
  for (const c of cuotas ?? []) {
    if (!cuotasPorCredito[c.credito_id]) cuotasPorCredito[c.credito_id] = []
    cuotasPorCredito[c.credito_id].push(c)
  }

  return (
    <div>
      <PortalHeader />
      <div className="px-5 py-4">
        <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Mi crédito</p>
        <h1 className="text-xl font-black text-oriental-black mt-0.5">
          {(creditos?.length ?? 0)} {(creditos?.length ?? 0) === 1 ? 'financiamiento' : 'financiamientos'}
        </h1>
      </div>

      {(!creditos || creditos.length === 0) && (
        <div className="mx-5 text-center py-12 bg-gray-50 rounded-2xl text-oriental-gray">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm">Aún no hay créditos vinculados a su cuenta.</p>
        </div>
      )}

      <div className="px-5 space-y-4">
        {(creditos ?? []).map((c: any) => {
          const cs = cuotasPorCredito[c.id] ?? []
          const total = cs.length
          const pagadas = cs.filter(x => x.estado === 'pagada').length
          const saldo = cs.reduce((s: number, x: any) => {
            if (x.estado === 'pendiente' || x.estado === 'vencida') return s + Number(x.monto)
            if (x.estado === 'abono_parcial') return s + Math.max(0, Number(x.monto) - Number(x.monto_pagado ?? 0))
            return s
          }, 0)
          const proxima = cs.find(x => (x.estado === 'pendiente' || x.estado === 'vencida' || x.estado === 'abono_parcial'))
          const proximaMonto = proxima ? Math.max(0, Number(proxima.monto) - Number(proxima.monto_pagado ?? 0)) : 0
          const pct = total > 0 ? Math.round((pagadas / total) * 100) : 0

          return (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-br from-oriental-red to-red-700 text-white">
                <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest">Plan</p>
                <p className="text-base font-black">{PLAN_LABEL[c.plan_tipo] ?? c.plan_tipo}</p>
                {c.vehiculos && (
                  <p className="text-xs text-red-100 mt-0.5">
                    {c.vehiculos.marca} {c.vehiculos.modelo} {c.vehiculos.placa ? `· ${c.vehiculos.placa}` : ''}
                  </p>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Progreso */}
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-[10px] font-bold text-oriental-gray uppercase">Progreso</p>
                    <p className="text-xs font-black text-oriental-black">{pagadas} / {total} cuotas · {pct}%</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[10px] text-oriental-gray uppercase">Saldo pendiente</p>
                    <p className="text-base font-black text-oriental-red">${fmtMoney(saldo)}</p>
                  </div>
                  {proxima && proximaMonto > 0 && (
                    <div>
                      <p className="text-[10px] text-oriental-gray uppercase">Próxima cuota</p>
                      <p className="text-base font-black text-oriental-black">${fmtMoney(proximaMonto)}</p>
                      <p className="text-[10px] text-oriental-gray">Vence {fmtFecha(proxima.fecha_vencimiento)}</p>
                    </div>
                  )}
                </div>

                {/* Cronograma */}
                <details className="pt-1">
                  <summary className="text-xs font-bold text-oriental-red cursor-pointer hover:underline">
                    Ver todas las cuotas ({total})
                  </summary>
                  <div className="mt-3 space-y-1 max-h-96 overflow-y-auto pr-1">
                    {cs.map((x: any) => {
                      const cfg = ESTADO_CFG[x.estado] ?? ESTADO_CFG.pendiente
                      const restante = Math.max(0, Number(x.monto) - Number(x.monto_pagado ?? 0))
                      return (
                        <div key={x.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                          <div>
                            <p className="text-xs font-bold text-oriental-black">Cuota {x.numero_cuota}</p>
                            <p className="text-[10px] text-oriental-gray flex items-center gap-1">
                              <Calendar size={9} /> {fmtFecha(x.fecha_vencimiento)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-oriental-black">${fmtMoney(x.estado === 'pagada' ? Number(x.monto) : restante)}</p>
                            <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </details>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mx-5 my-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
        <p className="text-[11px] text-blue-900 leading-relaxed">
          Para reportar un pago o consultar dudas, contacte a administración por WhatsApp.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
