import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import EgresosSinCentroClient from './EgresosSinCentroClient'

export const dynamic = 'force-dynamic'
/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export type FilaEgresoSinCentro = {
  id: string
  numero: string
  fecha: string | null
  beneficiario: string
  categoria: string | null
  concepto: string | null
  montoUsd: number
  sugerido: string | null      // centro id, o '__comun__' para gasto común
  etiqueta: string
}

// Sugerencia por categoría del egreso.
function sugerirEgreso(categoria: string | null): { sugerido: string | null; etiqueta: string } {
  const c = (categoria ?? '').toLowerCase()
  if (['cr_avanza_motors', 'repuestos', 'cr_plaza', 'costos_repuestos'].includes(c)) return { sugerido: 'repuestos', etiqueta: 'Repuestos' }
  if (['taller', 'costos_servicios'].includes(c)) return { sugerido: 'servicio', etiqueta: 'Servicio/Taller' }
  if (['articulos_suministros', 'mantenimiento', 'servicios_profesionales', 'alquiler', 'servicios_publicos', 'nomina', 'vigilancia', 'administracion'].includes(c)) return { sugerido: '__comun__', etiqueta: 'Gasto común (se reparte)' }
  if (c === 'vehimotors') return { sugerido: 'vehimotors', etiqueta: 'Vehimotors (terceros)' }
  return { sugerido: null, etiqueta: 'Revisar a mano' }
}

const montoUsd = (e: any) => e?.moneda === 'VES' && Number(e?.tasa_cambio) > 0 ? Number(e.monto) / Number(e.tasa_cambio) : Number(e.monto)

export default async function EgresosSinCentroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const egresos = await fetchAllRows<any>((from, to) => supabase
    .from('egresos')
    .select('id, numero_egreso, monto, moneda, tasa_cambio, fecha_egreso, categoria, concepto, beneficiario, estado, es_comun')
    .is('centro_costo_id', null)
    .or('es_comun.is.null,es_comun.eq.false')
    .not('estado', 'in', '("anulado","rechazado")')
    .order('fecha_egreso', { ascending: false })
    .range(from, to))

  const filas: FilaEgresoSinCentro[] = egresos.map(e => {
    const sug = sugerirEgreso(e.categoria ?? null)
    return {
      id: e.id,
      numero: e.numero_egreso ?? '—',
      fecha: e.fecha_egreso ?? null,
      beneficiario: e.beneficiario ?? '—',
      categoria: e.categoria ?? null,
      concepto: e.concepto ?? null,
      montoUsd: montoUsd(e),
      sugerido: sug.sugerido,
      etiqueta: sug.etiqueta,
    }
  })

  const { data: centros } = await supabase
    .from('centros_costo').select('id, nombre').eq('activo', true).order('orden')

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <Layers size={22} className="text-oriental-red" /> Egresos sin centro de costo
          </h1>
          <p className="text-oriental-gray text-sm mt-0.5">
            Asigna el centro a cada egreso. Los <b>gastos comunes</b> (fijos: alquiler, luz, vigilancia, nómina…) se reparten por % entre las líneas.
          </p>
        </div>
      </div>

      <EgresosSinCentroClient filas={filas} centros={(centros ?? []) as any} />
    </div>
  )
}
