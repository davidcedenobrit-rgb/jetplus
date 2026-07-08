import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CircleDollarSign, Plus, Calendar, Clock, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'

function fmtMoney(n: number, moneda: string) {
  const val = n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
  return moneda === 'VES' ? `Bs. ${val}` : `$${val}`
}

function fmtFecha(s: string | null) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  pendiente_aprobacion: { label: 'Pendiente de verificación', bg: 'bg-amber-50',  color: 'text-amber-800',  icon: Clock },
  aprobado:             { label: 'Aprobado',                  bg: 'bg-green-50',  color: 'text-green-800',  icon: CheckCircle2 },
  rechazado:            { label: 'Rechazado',                 bg: 'bg-red-50',    color: 'text-red-800',    icon: XCircle },
  correccion_requerida: { label: 'Requiere corrección',       bg: 'bg-orange-50', color: 'text-orange-800', icon: XCircle },
  enviado_carla:        { label: 'En proceso',                bg: 'bg-purple-50', color: 'text-purple-800', icon: Clock },
  enviado_deposito:     { label: 'En depósito',               bg: 'bg-blue-50',   color: 'text-blue-800',   icon: Clock },
  depositado:           { label: 'Depositado',                bg: 'bg-emerald-50',color: 'text-emerald-800',icon: CheckCircle2 },
  entregado_carla:      { label: 'Entregado',                 bg: 'bg-teal-50',   color: 'text-teal-800',   icon: CheckCircle2 },
  reportado_vehimotors: { label: 'Reportado a Vehimotors',    bg: 'bg-indigo-50', color: 'text-indigo-800', icon: CheckCircle2 },
}

export default async function PagosPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin.from('cliente_cuentas').select('cliente_id').eq('user_id', user.id).single()
  if (!cuenta) redirect('/portal/login')

  const { data: pagos } = await admin
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, metodo_pago, fecha_pago, estado, comprobante_url, placa')
    .eq('cliente_id', cuenta.cliente_id)
    .eq('origen', 'portal_cliente')
    .order('fecha_registro', { ascending: false })
    .limit(50)

  return (
    <div>
      <PortalHeader />

      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Mis pagos</p>
          <h1 className="text-xl font-black text-oriental-black mt-0.5">
            {(pagos?.length ?? 0)} {(pagos?.length ?? 0) === 1 ? 'pago reportado' : 'pagos reportados'}
          </h1>
        </div>
        <Link
          href="/portal/pagos/nuevo"
          className="flex items-center gap-1.5 px-4 py-2 bg-oriental-red text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100"
        >
          <Plus size={14} /> Reportar
        </Link>
      </div>

      {(!pagos || pagos.length === 0) && (
        <div className="mx-5 text-center py-12 bg-gray-50 rounded-2xl">
          <CircleDollarSign size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-oriental-gray">Aún no has reportado ningún pago.</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Reporta tus pagos aquí y el equipo los verificará.</p>
          <Link
            href="/portal/pagos/nuevo"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-oriental-red text-white text-sm font-bold rounded-xl"
          >
            <Plus size={13} /> Reportar mi primer pago
          </Link>
        </div>
      )}

      <div className="px-5 space-y-3">
        {(pagos ?? []).map(p => {
          const cfg = ESTADO_CFG[p.estado] ?? { label: p.estado, bg: 'bg-gray-100', color: 'text-gray-700', icon: Clock }
          const Icon = cfg.icon
          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[11px] font-mono font-bold text-oriental-red">{p.numero_recibo}</p>
                  <p className="text-sm font-bold text-oriental-black mt-0.5">{p.concepto}</p>
                  {p.placa && <p className="text-[10px] font-mono text-oriental-gray mt-0.5">{p.placa}</p>}
                </div>
                <p className="text-lg font-black text-oriental-black">{fmtMoney(Number(p.monto), p.moneda)}</p>
              </div>

              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                <Icon size={11} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{cfg.label}</span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-oriental-gray flex items-center gap-1">
                  <Calendar size={10} /> {fmtFecha(p.fecha_pago)} · {p.metodo_pago}
                </p>
                {p.comprobante_url && (
                  <a
                    href={p.comprobante_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-oriental-red font-bold hover:underline"
                  >
                    <ExternalLink size={10} /> Ver comprobante
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
