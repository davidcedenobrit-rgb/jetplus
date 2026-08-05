import { Fragment } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown } from 'lucide-react'
import { esSuperAdmin } from '@/lib/super-admin'
import { nombreClase } from '@/lib/contabilidad/cuentas-selector'

export const dynamic = 'force-dynamic'

const ROLES_CONTA = ['director', 'admin', 'jose', 'contabilidad']

type Fila = {
  codigo: string
  nombre: string
  clase: string
  ingresos: number
  egresos: number
  nMov: number
}

// Equivalente en USD de un movimiento (para poder sumar cuentas con monedas
// mezcladas). VES se convierte con su tasa del día; sin tasa no se puede
// convertir y se cuenta como 0 (se refleja en "sin tasa").
function usdEquiv(monto: number, moneda: string | null, tasa: number | null): number {
  const m = Number(monto) || 0
  if (moneda === 'VES') return tasa && tasa > 0 ? m / tasa : 0
  return m // USD, USDT u otras ya en dólares
}

export default async function MayorPorCuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!esSuperAdmin(user.email) && !ROLES_CONTA.includes(rol)) redirect('/dashboard')

  const admin = await createAdminClient()

  const [{ data: egresos }, { data: ingresos }] = await Promise.all([
    admin.from('egresos')
      .select('cuenta_contable, cuenta_contable_nombre, monto, moneda, tasa_cambio')
      .eq('afecta_plan', true).not('cuenta_contable', 'is', null),
    admin.from('ingresos')
      .select('cuenta_contable, cuenta_contable_nombre, monto, moneda, tasa_cambio')
      .eq('afecta_plan', true).not('cuenta_contable', 'is', null),
  ])

  const map = new Map<string, Fila>()
  let sinTasa = 0
  const claseDe = (cod: string) => cod.split('.')[0]
  const getFila = (cod: string, nombre: string | null) => {
    let f = map.get(cod)
    if (!f) { f = { codigo: cod, nombre: nombre ?? cod, clase: claseDe(cod), ingresos: 0, egresos: 0, nMov: 0 }; map.set(cod, f) }
    return f
  }

  for (const e of egresos ?? []) {
    const cod = e.cuenta_contable as string
    const f = getFila(cod, e.cuenta_contable_nombre as string | null)
    if (e.moneda === 'VES' && !(Number(e.tasa_cambio) > 0)) sinTasa++
    f.egresos += usdEquiv(Number(e.monto), e.moneda as string, Number(e.tasa_cambio))
    f.nMov++
  }
  for (const i of ingresos ?? []) {
    const cod = i.cuenta_contable as string
    const f = getFila(cod, i.cuenta_contable_nombre as string | null)
    if (i.moneda === 'VES' && !(Number(i.tasa_cambio) > 0)) sinTasa++
    f.ingresos += usdEquiv(Number(i.monto), i.moneda as string, Number(i.tasa_cambio))
    f.nMov++
  }

  // ordenar jerárquico por segmentos numéricos del código
  const filas = [...map.values()].sort((a, b) => {
    const pa = a.codigo.split('.'), pb = b.codigo.split('.')
    for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
      const na = parseInt(pa[k] ?? '0', 10), nb = parseInt(pb[k] ?? '0', 10)
      if (na !== nb) return na - nb
    }
    return 0
  })

  const totIngresos = filas.reduce((s, f) => s + f.ingresos, 0)
  const totEgresos = filas.reduce((s, f) => s + f.egresos, 0)
  const f2 = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // agrupar por clase para encabezados
  const porClase = new Map<string, Fila[]>()
  for (const f of filas) {
    if (!porClase.has(f.clase)) porClase.set(f.clase, [])
    porClase.get(f.clase)!.push(f)
  }
  const clases = [...porClase.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contabilidad" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
          <BookOpen size={20} className="text-oriental-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Mayor por cuenta</h1>
          <p className="text-oriental-gray text-sm">Ingresos y egresos acumulados por cuenta del plan · equivalente en USD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-green-600 mb-1"><TrendingUp size={16} /><p className="text-[11px] uppercase tracking-wider font-semibold">Ingresos</p></div>
          <p className="text-2xl font-black text-oriental-black">${f2(totIngresos)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-oriental-red mb-1"><TrendingDown size={16} /><p className="text-[11px] uppercase tracking-wider font-semibold">Egresos</p></div>
          <p className="text-2xl font-black text-oriental-black">${f2(totEgresos)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Neto</p>
          <p className={`text-2xl font-black ${totIngresos - totEgresos >= 0 ? 'text-green-700' : 'text-oriental-red'}`}>${f2(totIngresos - totEgresos)}</p>
        </div>
      </div>

      {sinTasa > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {sinTasa} movimiento{sinTasa > 1 ? 's' : ''} en bolívares sin tasa registrada — no se pudieron convertir a USD y cuentan como 0. Revisa que esos egresos/ingresos tengan la tasa del día.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Movimientos por cuenta ({filas.length} cuentas con movimiento)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Cuenta</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Mov.</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Ingresos (USD)</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Egresos (USD)</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Neto (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-oriental-gray text-sm">
                  Aún no hay movimientos asignados a cuentas. Registra ingresos/egresos con el tilde &quot;Afecta al plan de cuentas&quot; para alimentar el mayor.
                </td></tr>
              ) : clases.map(([clase, fs]) => (
                <Fragment key={clase}>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-oriental-gray">{clase} · {nombreClase(clase)}</td>
                  </tr>
                  {fs.map(f => (
                    <tr key={f.codigo} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-[11px] font-semibold text-oriental-red mr-2">{f.codigo}</span>
                        <span className="text-oriental-black">{f.nombre}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-oriental-gray tabular-nums">{f.nMov}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-green-700">{f.ingresos ? f2(f.ingresos) : '—'}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-oriental-red">{f.egresos ? f2(f.egresos) : '—'}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-oriental-black">{f2(f.ingresos - f.egresos)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-oriental-gray mt-3">
        Los montos en bolívares se expresan en su equivalente en USD usando la tasa registrada en cada movimiento. Este mayor se alimenta automáticamente con cada ingreso/egreso que tenga marcada una cuenta contable.
      </p>
    </div>
  )
}
