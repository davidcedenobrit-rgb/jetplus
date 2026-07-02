import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FileText, Calendar, Download, Car } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'

function fmtMoney(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string | null) {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string; borderColor: string }> = {
  sin_respuesta: { label: 'Pendiente de respuesta', bg: 'bg-blue-50',   color: 'text-blue-800',   borderColor: 'border-l-blue-400' },
  aceptada:      { label: 'Aceptada',               bg: 'bg-green-50',  color: 'text-green-800',  borderColor: 'border-l-green-400' },
  rechazada:     { label: 'Rechazada',              bg: 'bg-red-50',    color: 'text-red-800',    borderColor: 'border-l-red-400' },
  pospuesta:     { label: 'Pospuesta',              bg: 'bg-purple-50', color: 'text-purple-800', borderColor: 'border-l-purple-400' },
  vencida:       { label: 'Vencida',                bg: 'bg-orange-50', color: 'text-orange-800', borderColor: 'border-l-orange-400' },
  reactivada:    { label: 'Reemplazada',            bg: 'bg-gray-50',   color: 'text-gray-600',   borderColor: 'border-l-gray-400' },
}

const MODALIDAD_LABEL: Record<string, string> = {
  contado: 'Contado',
  credito_24: 'Crédito 24 meses',
}

const PLAN_LABEL: Record<string, string> = {
  vehimotors: 'Vehimotors',
  banco_100: 'Banco 100%',
  ac500: 'Asegúrate $500',
}

export default async function CotizacionesPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin.from('cliente_cuentas').select('cliente_id').eq('user_id', user.id).single()
  if (!cuenta) redirect('/portal/login')

  const { data: cotizaciones } = await admin
    .from('cotizaciones')
    .select('id, numero, fecha, vencimiento, marca, modelo, modalidad, plan, total_inicial, cuota_mensual, estado, token_respuesta')
    .eq('cliente_id', cuenta.cliente_id)
    .order('fecha', { ascending: false })
    .limit(50)

  const activas = (cotizaciones ?? []).filter(c => c.estado === 'sin_respuesta')
  const otras = (cotizaciones ?? []).filter(c => c.estado !== 'sin_respuesta')

  return (
    <div>
      <PortalHeader />

      <div className="px-5 py-4">
        <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Mis cotizaciones</p>
        <h1 className="text-xl font-black text-oriental-black mt-0.5">
          {(cotizaciones?.length ?? 0)} {(cotizaciones?.length ?? 0) === 1 ? 'cotización' : 'cotizaciones'}
        </h1>
      </div>

      {(!cotizaciones || cotizaciones.length === 0) && (
        <div className="mx-5 text-center py-12 bg-gray-50 rounded-2xl text-oriental-gray">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm">Aún no tiene cotizaciones a su nombre.</p>
          <p className="text-xs mt-2 text-gray-400">Cuando su asesor emita una cotización aparecerá aquí.</p>
        </div>
      )}

      {activas.length > 0 && (
        <div className="mx-5 mb-5">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
            Pendientes de respuesta ({activas.length})
          </p>
          <div className="space-y-3">
            {activas.map(c => <CotizacionCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {otras.length > 0 && (
        <div className="mx-5 mb-5">
          <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest mb-2">
            Historial ({otras.length})
          </p>
          <div className="space-y-3">
            {otras.map(c => <CotizacionCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function CotizacionCard({ c }: { c: any }) {
  const cfg = ESTADO_CFG[c.estado] ?? ESTADO_CFG.sin_respuesta
  return (
    <div className={`bg-white border border-gray-100 border-l-4 ${cfg.borderColor} rounded-2xl overflow-hidden shadow-sm`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <p className="text-[11px] font-mono font-bold text-oriental-red">{c.numero}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <Car size={12} className="text-oriental-gray" />
          <p className="text-sm font-bold text-oriental-black">{c.marca} {c.modelo}</p>
        </div>
        <p className="text-[11px] text-oriental-gray mb-3">
          {MODALIDAD_LABEL[c.modalidad] ?? c.modalidad}{c.plan ? ` · ${PLAN_LABEL[c.plan] ?? c.plan}` : ''}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-oriental-gray uppercase font-semibold">
              {c.modalidad === 'contado' ? 'Total' : 'Inicial'}
            </p>
            <p className="text-base font-black text-oriental-black">${fmtMoney(Number(c.total_inicial))}</p>
          </div>
          {c.cuota_mensual != null && (
            <div>
              <p className="text-[10px] text-oriental-gray uppercase font-semibold">Cuota mensual</p>
              <p className="text-base font-black text-oriental-black">${fmtMoney(Number(c.cuota_mensual))}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] text-oriental-gray flex items-center gap-1">
            <Calendar size={10} /> {fmtFecha(c.fecha)}
            {c.vencimiento && c.estado === 'sin_respuesta' && (
              <span className="text-[10px] text-oriental-gray"> · vence {fmtFecha(c.vencimiento)}</span>
            )}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`/api/cotizaciones/${c.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-oriental-black text-[11px] font-bold rounded-lg"
            >
              <Download size={11} /> Ver PDF
            </a>
            {c.estado === 'sin_respuesta' && c.token_respuesta && (
              <Link
                href={`/responder/${c.token_respuesta}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-oriental-red hover:bg-red-700 text-white text-[11px] font-bold rounded-lg"
              >
                Responder
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
