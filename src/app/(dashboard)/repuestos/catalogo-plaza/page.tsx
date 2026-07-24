import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import CatalogoPlazaLista from './CatalogoPlazaLista'

export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

function equivUsd(n: number | null, moneda?: string | null, tasa?: number | null) {
  if (n == null) return 0
  if (moneda === 'VES') return tasa && Number(tasa) > 0 ? Number(n) / Number(tasa) : 0
  return Number(n)
}

export type FilaCatalogo = {
  key: string
  fecha: string | null
  numero: string
  proveedor: string
  telefono: string | null
  direccion: string | null
  repuesto: string
  cantidad: number
  precioUsd: number
  prevPrecio: number | null
  prevFecha: string | null
  pct: number | null
}

export default async function CatalogoPlazaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const compras = await fetchAllRows<any>((from, to) => supabase
    .from('solicitudes_repuestos')
    .select('id, numero, proveedor_plaza, proveedor_id, monto_plaza, moneda_plaza, tasa_plaza, fecha_compra_plaza, created_at, repuestos_items(descripcion, cantidad), proveedores(nombre, telefono, direccion)')
    .eq('estado', 'comprado_plaza')
    .order('fecha_compra_plaza', { ascending: false })
    .range(from, to))

  // Cada ítem comprado = una fila del catálogo, con su precio unitario en USD.
  const filas: FilaCatalogo[] = []
  for (const c of compras) {
    const items: any[] = c.repuestos_items ?? []
    const totalUnidades = items.reduce((s, it) => s + (Number(it.cantidad) || 1), 0) || 1
    const montoUsd = equivUsd(c.monto_plaza, c.moneda_plaza, c.tasa_plaza)
    const precioUnitario = montoUsd / totalUnidades
    const prov = c.proveedores
    for (const it of items) {
      filas.push({
        key: `${c.id}-${it.descripcion ?? ''}`,
        fecha: c.fecha_compra_plaza ?? (c.created_at ? String(c.created_at).slice(0, 10) : null),
        numero: c.numero,
        proveedor: c.proveedor_plaza ?? prov?.nombre ?? '—',
        telefono: prov?.telefono ?? null,
        direccion: prov?.direccion ?? null,
        repuesto: it.descripcion ?? '—',
        cantidad: Number(it.cantidad) || 1,
        precioUsd: precioUnitario,
        prevPrecio: null, prevFecha: null, pct: null,
      })
    }
  }

  // Comparativa: por repuesto (nombre normalizado), comparar cada compra con la anterior.
  const grupos = new Map<string, FilaCatalogo[]>()
  for (const f of filas) {
    const k = norm(f.repuesto)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(f)
  }
  for (const list of grupos.values()) {
    list.sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]
      if (prev.precioUsd > 0) {
        list[i].prevPrecio = prev.precioUsd
        list[i].prevFecha = prev.fecha
        list[i].pct = ((list[i].precioUsd - prev.precioUsd) / prev.precioUsd) * 100
      }
    }
  }

  // Orden de despliegue: más recientes primero.
  filas.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2">
            <BookOpen size={22} className="text-purple-600" /> Catálogo de compra en plaza
          </h1>
          <p className="text-oriental-gray text-sm mt-0.5">Historial de repuestos comprados en plaza con comparativa de precios para tomar decisiones.</p>
        </div>
      </div>

      <CatalogoPlazaLista filas={filas} />
    </div>
  )
}
