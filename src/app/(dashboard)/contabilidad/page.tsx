import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpenCheck, Upload, Layers, ScrollText, AlertTriangle } from 'lucide-react'
import { esSuperAdmin } from '@/lib/super-admin'
import { simularImportacion, CATALOGO } from '@/lib/contabilidad/plan-cuentas'

export const dynamic = 'force-dynamic'

export default async function ContabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!esSuperAdmin(user.email)) redirect('/dashboard')

  const sim = simularImportacion()
  const cuentas = CATALOGO.cuentas

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <BookOpenCheck size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Contabilidad</h1>
            <p className="text-oriental-gray text-sm">Plan de cuentas y capa contable · <span className="text-green-600 font-semibold">Catálogo cargado</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contabilidad/mayor" className="btn-secondary flex items-center gap-2 text-sm">
            <BookOpenCheck size={15} /> Mayor por cuenta
          </Link>
          <Link href="/contabilidad/importar" className="btn-primary flex items-center gap-2 text-sm">
            <Upload size={15} /> Importar catálogo (simulación)
          </Link>
        </div>
      </div>

      {/* Aviso */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          El catálogo definitivo ya está <b>cargado y activo</b> en la base de datos. Esta vista muestra la semilla vigente;
          los movimientos se enlazan a las cuentas desde &quot;Mayor por cuenta&quot;. Cualquier ajuste posterior del catálogo
          se versiona antes de reemplazar el activo.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<Layers size={16} />} label="Cuentas totales" value={sim.total} sub={`${sim.importadas} importadas · ${sim.propuestas} propuestas`} />
        <Kpi icon={<ScrollText size={16} />} label="De movimiento" value={sim.movimiento} sub={`${sim.titulos} de título (no reciben asientos)`} />
        <Kpi icon={<BookOpenCheck size={16} />} label="Debe / Haber" value={`${sim.naturalezaDebe} / ${sim.naturalezaHaber}`} sub="naturaleza contable" />
        <Kpi icon={<AlertTriangle size={16} />} label="Advertencias" value={sim.advertencias.length} sub="a validar con la contadora" alerta />
      </div>

      {/* Por clase */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black mb-3">Cuentas por clase</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {sim.porClase.map(c => (
            <div key={c.clase} className="p-3 rounded-lg border border-gray-100 bg-white">
              <p className="text-[11px] text-oriental-gray">{c.clase} · {c.nombre}</p>
              <p className="text-lg font-black text-oriental-black">{c.n}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vista previa del catálogo */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Plan de cuentas (vista previa · {cuentas.length} cuentas)</h2>
          <span className="text-[11px] text-oriental-gray">{CATALOGO.version}</span>
        </div>
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Código</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Nombre</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Naturaleza</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cuentas.map(c => (
                <tr key={c.codigo} className={`hover:bg-gray-50 ${c.tipo === 'titulo' ? 'bg-gray-50/50 font-semibold' : ''}`}>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-oriental-black whitespace-nowrap" style={{ paddingLeft: `${(c.nivel - 1) * 12 + 12}px` }}>{c.codigo}</td>
                  <td className="px-3 py-1.5 text-oriental-black">{c.nombre}</td>
                  <td className="px-3 py-1.5 text-xs capitalize text-oriental-gray">{c.naturaleza}</td>
                  <td className="px-3 py-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c.tipo === 'titulo' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>{c.tipo}</span>
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {c.origen === 'propuesta'
                      ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">propuesta</span>
                      : <span className="text-oriental-gray text-[11px]">importada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub, alerta }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; alerta?: boolean }) {
  return (
    <div className={`card p-4 ${alerta && Number(value) > 0 ? 'border-amber-200 bg-amber-50/40' : ''}`}>
      <div className="flex items-center gap-1.5 text-oriental-gray mb-1">{icon}<p className="text-[11px] uppercase tracking-wider font-semibold">{label}</p></div>
      <p className="text-2xl font-black text-oriental-black">{value}</p>
      {sub && <p className="text-[11px] text-oriental-gray mt-0.5">{sub}</p>}
    </div>
  )
}
