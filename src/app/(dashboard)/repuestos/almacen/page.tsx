import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Warehouse } from 'lucide-react'
import AlmacenClient from './AlmacenClient'

const ROL_ALMACEN = ['taller', 'arianna', 'admin', 'director', 'jose', 'mary', 'leysdem', 'almacen', 'almacenista']

export type AlmacenItem = {
  id: string
  descripcion: string
  referencia: string | null
  marca: string | null
  categoria: string | null
  cantidad: number
  ubicacion: string | null
  costo_unitario: number | null
  moneda: string
  stock_minimo: number
  notas: string | null
  updated_at: string
}

export type AlmacenMovimiento = {
  id: string
  item_id: string | null
  tipo: string
  cantidad: number
  taller_destino: string | null
  motivo: string | null
  referencia_doc: string | null
  saldo_resultante: number | null
  usuario_email: string | null
  notas: string | null
  created_at: string
}

export default async function AlmacenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_ALMACEN.includes(rol)) redirect('/repuestos')

  const items = await fetchAllRows<AlmacenItem>((from, to) => supabase
    .from('almacen_items')
    .select('id, descripcion, referencia, marca, categoria, cantidad, ubicacion, costo_unitario, moneda, stock_minimo, notas, updated_at')
    .eq('activo', true)
    .order('descripcion', { ascending: true })
    .range(from, to))

  const movimientos = await fetchAllRows<AlmacenMovimiento>((from, to) => supabase
    .from('almacen_movimientos')
    .select('id, item_id, tipo, cantidad, taller_destino, motivo, referencia_doc, saldo_resultante, usuario_email, notas, created_at')
    .order('created_at', { ascending: false })
    .range(from, to))

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50">
          <ArrowLeft size={16} />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
          <Warehouse size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Almacén La Oriental</h1>
          <p className="text-sm text-oriental-gray">Inventario de repuestos en stock · entradas, transferencias a taller y bitácora.</p>
        </div>
      </div>

      <AlmacenClient items={items ?? []} movimientos={movimientos ?? []} />
    </div>
  )
}
