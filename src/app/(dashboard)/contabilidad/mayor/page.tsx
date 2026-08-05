import { Fragment } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { esSuperAdmin } from '@/lib/super-admin'
import { nombreClase, nombreDeCuenta } from '@/lib/contabilidad/cuentas-selector'

export const dynamic = 'force-dynamic'

const ROLES_CONTA = ['director', 'admin', 'jose', 'contabilidad']

type MayorRow = { codigo: string; clase: string; n_lineas: number; total_debe: number; total_haber: number; saldo: number }

export default async function MayorPorCuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!esSuperAdmin(user.email) && !ROLES_CONTA.includes(rol)) redirect('/dashboard')

  const admin = await createAdminClient()
  // Mayor agregado en SQL (vista v_mayor_cuenta sobre los asientos de partida doble)
  const { data: filasRaw } = await admin.from('v_mayor_cuenta').select('*')
  // Nombres de cuenta desde la tabla del plan (para incluir cuentas de contrapartida)
  const { data: cuentasDb } = await admin.from('plan_cuentas')
    .select('codigo, nombre').eq('estado', 'activa')
  const nombreDb = new Map((cuentasDb ?? []).map((c: { codigo: string; nombre: string }) => [c.codigo, c.nombre]))
  const nombre = (cod: string) => nombreDb.get(cod) ?? nombreDeCuenta(cod) ?? cod

  const filas = ((filasRaw ?? []) as MayorRow[]).map(f => ({
    ...f,
    total_debe: Number(f.total_debe) || 0,
    total_haber: Number(f.total_haber) || 0,
    saldo: Number(f.saldo) || 0,
    nombre: nombre(f.codigo),
  })).sort((a, b) => {
    const pa = a.codigo.split('.'), pb = b.codigo.split('.')
    for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
      const na = parseInt(pa[k] ?? '0', 10), nb = parseInt(pb[k] ?? '0', 10)
      if (na !== nb) return na - nb
    }
    return 0
  })

  const totDebe = filas.reduce((s, f) => s + f.total_debe, 0)
  const totHaber = filas.reduce((s, f) => s + f.total_haber, 0)
  const f2 = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const porClase = new Map<string, typeof filas>()
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
          <p className="text-oriental-gray text-sm">Saldos por cuenta desde los asientos de partida doble · equivalente en USD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-oriental-gray mb-1"><TrendingUp size={16} /><p className="text-[11px] uppercase tracking-wider font-semibold">Total Debe</p></div>
          <p className="text-2xl font-black text-oriental-black">${f2(totDebe)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-oriental-gray mb-1"><TrendingDown size={16} /><p className="text-[11px] uppercase tracking-wider font-semibold">Total Haber</p></div>
          <p className="text-2xl font-black text-oriental-black">${f2(totHaber)}</p>
        </div>
        <div className={`card p-4 ${Math.abs(totDebe - totHaber) < 0.01 ? 'border-green-200 bg-green-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
          <div className="flex items-center gap-1.5 text-oriental-gray mb-1"><Scale size={16} /><p className="text-[11px] uppercase tracking-wider font-semibold">Balance</p></div>
          <p className={`text-2xl font-black ${Math.abs(totDebe - totHaber) < 0.01 ? 'text-green-700' : 'text-amber-700'}`}>
            {Math.abs(totDebe - totHaber) < 0.01 ? 'Cuadrado ✓' : `Δ ${f2(totDebe - totHaber)}`}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Saldos por cuenta ({filas.length} cuentas con movimiento)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Cuenta</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Líneas</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Debe (USD)</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Haber (USD)</th>
                <th className="text-right px-3 py-2 font-medium text-oriental-gray text-xs">Saldo (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-oriental-gray text-sm">
                  Aún no hay asientos. Registra ingresos/egresos con cuenta contable para alimentar el mayor.
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
                      <td className="px-3 py-1.5 text-right text-xs text-oriental-gray tabular-nums">{f.n_lineas}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-oriental-black">{f.total_debe ? f2(f.total_debe) : '—'}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-oriental-black">{f.total_haber ? f2(f.total_haber) : '—'}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${f.saldo >= 0 ? 'text-oriental-black' : 'text-oriental-red'}`}>{f2(f.saldo)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-oriental-gray mt-3">
        Cada ingreso/egreso con cuenta contable genera un asiento de partida doble (borrador para revisión contable). Los montos en bolívares se expresan en USD con la tasa de cada movimiento. La contrapartida de tesorería se asigna por método/banco y la retención aún no se desglosa en el asiento automático.
      </p>
    </div>
  )
}
