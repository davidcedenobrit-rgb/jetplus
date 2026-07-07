import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, User } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import BandejaCustodio from './BandejaCustodio'

const ROL_VISIBLE = ['jose', 'admin', 'director', 'carla', 'mary', 'leysdem']
const CANALES_CUSTODIA = ['efectivo', 'personal_jose', 'personal_carla', 'personal_mary', 'personal_leysdem', 'zelle', 'usdt', 'otro']

const CANAL_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  personal_jose: 'Cta. José',
  personal_carla: 'Cta. Carla',
  personal_mary: 'Cta. Mary',
  personal_leysdem: 'Cta. Leysdem',
  zelle: 'Zelle',
  usdt: 'USDT',
  otro: 'Otro',
}

const ROL_LABELS: Record<string, string> = {
  jose: 'José Rojas',
  carla: 'Carla',
  mary: 'Mary',
  leysdem: 'Leysdem',
}

export default async function CustodioBandejaPage({ params }: { params: Promise<{ custodio: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? 'editor'

  if (!ROL_VISIBLE.includes(rol)) redirect('/dashboard')

  const { custodio: custodioId } = await params

  // Datos del custodio
  const { data: custodio } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .eq('id', custodioId)
    .maybeSingle()

  if (!custodio) notFound()

  // Ingresos en poder de este custodio
  const { data: ingresos } = await supabase
    .from('ingresos')
    .select('id, numero_recibo, monto, moneda, canal_destino, custodio_desde, fecha_pago, concepto, estado, clientes(nombre, cedula_rif)')
    .eq('custodio_id', custodioId)
    .in('canal_destino', CANALES_CUSTODIA)
    .in('estado', ['aprobado', 'enviado_carla', 'entregado_carla'])
    .order('custodio_desde', { ascending: false })

  // Lista de custodios posibles (para el traspaso)
  const { data: custodiosData } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .in('rol', ['jose', 'carla', 'mary', 'leysdem'])

  const total = (ingresos ?? []).reduce((s, i) => s + Number(i.monto), 0)

  // Desglose por canal
  const porCanal = new Map<string, { total: number; count: number }>()
  for (const ing of ingresos ?? []) {
    const k = ing.canal_destino as string
    const prev = porCanal.get(k) ?? { total: 0, count: 0 }
    porCanal.set(k, { total: prev.total + Number(ing.monto), count: prev.count + 1 })
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/carla" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-oriental-red" />
            <h1 className="text-xl font-bold text-oriental-black">
              Efectivo en poder de {ROL_LABELS[custodio.rol] ?? custodio.nombre}
            </h1>
          </div>
          <p className="text-oriental-gray text-xs mt-0.5">
            {(ingresos ?? []).length} recibo{(ingresos ?? []).length !== 1 ? 's' : ''} · Total {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Resumen por canal */}
      {(ingresos ?? []).length > 0 && (
        <div className="card p-5 mb-5">
          <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide mb-3">Desglose por canal</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from(porCanal.entries()).map(([canal, info]) => (
              <div key={canal} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-oriental-gray uppercase">{CANAL_LABELS[canal] ?? canal}</p>
                <p className="text-lg font-black text-oriental-black mt-1">{formatCurrency(info.total)}</p>
                <p className="text-[10px] text-oriental-gray mt-0.5">{info.count} recibo{info.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de ingresos con seleccion multiple */}
      {(ingresos ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <User size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-oriental-gray">Sin recibos en poder</p>
        </div>
      ) : (
        <BandejaCustodio
          ingresos={(ingresos ?? []) as any}
          custodios={(custodiosData ?? []) as any}
          custodioActualId={custodio.id}
        />
      )}
    </div>
  )
}
