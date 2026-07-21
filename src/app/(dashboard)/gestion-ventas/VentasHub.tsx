'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ShoppingCart, ListChecks, ExternalLink } from 'lucide-react'
import ProformasTab from '../link-ventas/ProformasTab'

type Venta = {
  id: string
  marca: string
  modelo: string
  placa: string | null
  tipo_compra: string | null
  precio_total: number | null
  created_at: string
  cliente_nombre: string
  cliente_ci: string
  proforma_numero: string | null
  etapa_key: string
  etapa_label: string
}

const ETAPA_CFG: Record<string, string> = {
  entregado: 'bg-green-100 text-green-700',
  inicial: 'bg-amber-100 text-amber-700',
  credito: 'bg-blue-100 text-blue-700',
  mora: 'bg-red-100 text-red-700',
  pagado: 'bg-emerald-100 text-emerald-700',
  contado: 'bg-indigo-100 text-indigo-700',
  vendido: 'bg-gray-100 text-gray-600',
}

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (s: string | null) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function VentasHub({ ventas }: { ventas: Venta[] }) {
  const router = useRouter()
  const [vista, setVista] = useState<'registradas' | 'registrar'>('registradas')
  const [q, setQ] = useState('')
  const [etapa, setEtapa] = useState<string>('todas')

  const etapas = useMemo(() => {
    const set = new Map<string, string>()
    ventas.forEach(v => set.set(v.etapa_key, v.etapa_label))
    return Array.from(set.entries())
  }, [ventas])

  const filtradas = useMemo(() => {
    const nq = norm(q.trim())
    return ventas.filter(v => {
      if (etapa !== 'todas' && v.etapa_key !== etapa) return false
      if (!nq) return true
      return norm(v.cliente_nombre).includes(nq) || norm(v.cliente_ci).includes(nq) ||
        norm(`${v.marca} ${v.modelo}`).includes(nq) || norm(v.placa ?? '').includes(nq) ||
        norm(v.proforma_numero ?? '').includes(nq)
    })
  }, [ventas, q, etapa])

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Ventas</h1>
          <p className="text-oriental-gray text-sm mt-1">Todo lo vendido y en qué parte del proceso va cada venta</p>
        </div>
        <button
          onClick={() => setVista('registrar')}
          className="btn-primary flex items-center gap-2 shrink-0">
          <ShoppingCart size={16} /> Registrar venta
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['registradas', 'Ventas registradas', ListChecks], ['registrar', 'Registrar venta', ShoppingCart]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              vista === k ? 'border-oriental-red text-oriental-red' : 'border-transparent text-gray-500 hover:text-oriental-black'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {vista === 'registradas' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por cliente, cédula, modelo, placa o N° de proforma…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red" />
            </div>
            <select value={etapa} onChange={e => setEtapa(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red bg-white">
              <option value="todas">Todas las etapas</option>
              {etapas.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-400 mb-3">{filtradas.length} de {ventas.length} ventas</p>

          {filtradas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No hay ventas que coincidan.</p>
          ) : (
            <div className="space-y-2">
              {filtradas.map(v => (
                <Link key={v.id} href={`/vehiculos/${v.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 border border-gray-200 rounded-xl p-4 hover:border-oriental-red hover:bg-red-50/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-oriental-black text-sm truncate">{v.marca} {v.modelo}</span>
                      {v.placa && <span className="font-mono text-[11px] text-gray-400">{v.placa}</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ETAPA_CFG[v.etapa_key] ?? 'bg-gray-100 text-gray-600'}`}>{v.etapa_label}</span>
                      {v.proforma_numero && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">{v.proforma_numero}</span>}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{v.cliente_nombre} {v.cliente_ci && <span className="text-gray-400">· {v.cliente_ci}</span>}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-oriental-black">${fmt(v.precio_total)}</p>
                    <p className="text-[10px] text-gray-400">{fmtFecha(v.created_at)}</p>
                  </div>
                  <ExternalLink size={14} className="text-gray-300 shrink-0 hidden sm:block" />
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5">
            <p className="text-sm text-indigo-900 font-semibold mb-1">Registrar una venta</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Toda venta parte de una <b>proforma</b>. Busca al cliente abajo y dale a <b>Registrar venta</b> en su proforma: se abre el registro con el vehículo y el plan ya cargados desde la cotización — ahí confirmas o creas el cliente al instante y completas el pago inicial y el crédito.{' '}
              ¿Aún no tiene proforma? Genérala desde su cotización aceptada en <Link href="/link-ventas?tab=cotizaciones" className="font-bold underline">Cotizaciones</Link>.
            </p>
          </div>
          <ProformasTab />
        </div>
      )}
    </div>
  )
}
