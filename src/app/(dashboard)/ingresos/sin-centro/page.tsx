import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { centroSugerido } from '@/lib/centros-costo'
import SinCentroClient from './SinCentroClient'

export const dynamic = 'force-dynamic'
/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export type FilaSinCentro = {
  id: string
  numero: string
  fecha: string | null
  cliente: string
  concepto: string | null
  monto: number
  moneda: string
  montoUsd: number
  estado: string
  origenEtiqueta: string
  centroSugerido: string | null
}

export default async function SinCentroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const ingresos = await fetchAllRows<any>((from, to) => supabase
    .from('ingresos')
    .select('id, numero_recibo, monto, moneda, tasa_cambio, fecha_pago, fecha_registro, concepto, estado, clientes(nombre)')
    .is('centro_costo_id', null)
    .not('estado', 'in', '("anulado","rechazado")')
    .order('fecha_registro', { ascending: false })
    .range(from, to))

  const ids = ingresos.map(i => i.id)

  // Origen: cuota ligada (plan_tipo + numero_cuota) vía cuota_ingresos.
  const links = ids.length
    ? await fetchAllRows<any>((from, to) => supabase
        .from('cuota_ingresos')
        .select('ingreso_id, monto_aplicado, cuotas(numero_cuota, creditos(plan_tipo))')
        .in('ingreso_id', ids)
        .range(from, to))
    : []

  // Para cada ingreso, tomamos la cuota ligada con mayor monto aplicado como
  // origen dominante (un ingreso puede pagar varias cuotas).
  const dominante = new Map<string, { plan: string | null; num: number | null; aplicado: number }>()
  for (const l of links) {
    const plan = l.cuotas?.creditos?.plan_tipo ?? null
    const num = l.cuotas?.numero_cuota ?? null
    const aplicado = Number(l.monto_aplicado) || 0
    const prev = dominante.get(l.ingreso_id)
    if (!prev || aplicado > prev.aplicado) dominante.set(l.ingreso_id, { plan, num, aplicado })
  }

  const montoUsd = (i: any) => i?.moneda === 'VES' && Number(i?.tasa_cambio) > 0 ? Number(i.monto) / Number(i.tasa_cambio) : Number(i.monto)

  const filas: FilaSinCentro[] = ingresos.map(i => {
    const dom = dominante.get(i.id)
    const sug = centroSugerido(dom?.plan ?? null, dom?.num ?? null)
    return {
      id: i.id,
      numero: i.numero_recibo,
      fecha: i.fecha_pago ?? (i.fecha_registro ? String(i.fecha_registro).slice(0, 10) : null),
      cliente: i.clientes?.nombre ?? '—',
      concepto: i.concepto ?? null,
      monto: Number(i.monto),
      moneda: i.moneda,
      montoUsd: montoUsd(i),
      estado: i.estado,
      origenEtiqueta: sug.etiqueta,
      centroSugerido: sug.centro,
    }
  })

  const { data: centros } = await supabase
    .from('centros_costo').select('id, nombre').eq('activo', true).order('orden')

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/ingresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <Layers size={22} className="text-oriental-red" /> Ingresos sin centro de costo
          </h1>
          <p className="text-oriental-gray text-sm mt-0.5">
            Asigna el centro a cada ingreso. Las cuotas de Vehimotors y las mensuales de AC500 no son de La Oriental: van al centro <b>Vehimotors</b>.
          </p>
        </div>
      </div>

      <SinCentroClient filas={filas} centros={(centros ?? []) as any} />
    </div>
  )
}
