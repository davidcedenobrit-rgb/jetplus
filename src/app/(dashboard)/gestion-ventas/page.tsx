import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import VentasHub from './VentasHub'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Etapa del proceso de cada venta (para el tablero "Ventas registradas").
function calcularEtapa(v: any, cred: any | undefined, acu: any | undefined): { key: string; label: string } {
  if (v.estado === 'entregado') return { key: 'entregado', label: 'Entregado' }
  if (acu && (acu.estado === 'pendiente' || Number(acu.monto_pagado ?? 0) < Number(acu.monto_acordado ?? 0))) {
    return { key: 'inicial', label: 'Inicial pendiente' }
  }
  if (cred) {
    if (cred.estado === 'mora') return { key: 'mora', label: 'Crédito en mora' }
    if (cred.estado === 'pagado') return { key: 'pagado', label: 'Crédito pagado' }
    return { key: 'credito', label: 'Crédito activo' }
  }
  if (v.tipo_compra === 'contado') return { key: 'contado', label: 'Contado' }
  return { key: 'vendido', label: 'Vendida' }
}

export default async function GestionVentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const [vehiculos, creditos, acuerdos, proformas, divisiones] = await Promise.all([
    fetchAllRows<any>((from, to) => supabase
      .from('vehiculos')
      .select('id, marca, modelo, placa, tipo_compra, estado, precio_total, created_at, cliente_id, clientes(nombre, cedula_rif)')
      .order('created_at', { ascending: false })
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('creditos')
      .select('vehiculo_id, estado, plan_tipo, saldo')
      .not('vehiculo_id', 'is', null)
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('acuerdos_inicial')
      .select('vehiculo_id, estado, monto_acordado, monto_pagado')
      .not('vehiculo_id', 'is', null)
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('proformas')
      .select('id, vehiculo_id, numero, precio_vehiculo, cotizacion_id, cliente_id')
      .not('vehiculo_id', 'is', null)
      .range(from, to)),
    fetchAllRows<any>((from, to) => supabase
      .from('ventas_division_contable')
      .select('*')
      .range(from, to)),
  ])

  const credMap: Record<string, any> = {}
  for (const c of creditos ?? []) { if (c.vehiculo_id && !credMap[c.vehiculo_id]) credMap[c.vehiculo_id] = c }
  const acuMap: Record<string, any> = {}
  for (const a of acuerdos ?? []) { if (a.vehiculo_id && !acuMap[a.vehiculo_id]) acuMap[a.vehiculo_id] = a }
  const proMap: Record<string, any> = {}
  for (const p of proformas ?? []) { if (p.vehiculo_id && !proMap[p.vehiculo_id]) proMap[p.vehiculo_id] = p }
  const divMap: Record<string, any> = {}
  for (const d of divisiones ?? []) { if (d.vehiculo_id) divMap[d.vehiculo_id] = d }

  const ventas = (vehiculos ?? []).map((v: any) => {
    const etapa = calcularEtapa(v, credMap[v.id], acuMap[v.id])
    const pro = proMap[v.id]
    const div = divMap[v.id]
    const precioBaseVenta = Number(div?.precio_venta ?? pro?.precio_vehiculo ?? v.precio_total ?? 0)
    return {
      id: v.id,
      marca: v.marca,
      modelo: v.modelo,
      placa: v.placa,
      tipo_compra: v.tipo_compra,
      precio_total: v.precio_total,
      created_at: v.created_at,
      cliente_nombre: v.clientes?.nombre ?? '—',
      cliente_ci: v.clientes?.cedula_rif ?? '',
      proforma_numero: pro?.numero ?? null,
      proforma_id: pro?.id ?? null,
      cotizacion_id: pro?.cotizacion_id ?? null,
      cliente_id: v.cliente_id ?? pro?.cliente_id ?? null,
      etapa_key: etapa.key,
      etapa_label: etapa.label,
      // División contable
      div_definida: !!div,
      precio_venta: precioBaseVenta,
      pago_vehimotors: Number(div?.pago_vehimotors ?? 0),
      comision_pct: Number(div?.comision_pct ?? 0),
      comision_monto: Number(div?.comision_monto ?? 0),
      vendedora: div?.vendedora ?? '',
      reportado_vm: !!div?.reportado_vm,
      div_notas: div?.notas ?? '',
    }
  })

  return <VentasHub ventas={ventas} />
}
