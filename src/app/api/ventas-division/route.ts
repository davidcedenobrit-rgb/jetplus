export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function num(x: any) { const n = Number(x); return Number.isFinite(n) ? n : 0 }

// Guarda (upsert) la división contable de una venta.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const vehiculoId = b?.vehiculoId
  if (!vehiculoId) return NextResponse.json({ error: 'Falta el vehículo' }, { status: 400 })

  const supabase = await createAdminClient()

  const precioVenta = num(b.precioVenta)
  const pagoVM = num(b.pagoVehimotors)
  // "Comisión de venta" = comisión bruta (monto). Se conserva comision_pct = % sobre el precio para reportes.
  const comisionMonto = b.comisionMonto != null ? num(b.comisionMonto) : Math.round(precioVenta * num(b.comisionPct)) / 100
  const comisionPct = precioVenta > 0 ? Math.round((comisionMonto / precioVenta) * 10000) / 100 : num(b.comisionPct)
  const montoProforma = num(b.montoProforma)
  const polizaCarro = num(b.polizaCarro)
  const polizaVida = num(b.polizaVida)
  const obsequioClientes = num(b.obsequioClientes)
  const alfombras = num(b.alfombras)

  // Nuevo flujo de división contable (tipo de venta + potes)
  const TIPOS_VENTA = ['contado', 'credito_vehimotors', 'credito_banca_nacional', 'credito_financiadora_interno']
  const tipoVenta = TIPOS_VENTA.includes(b.tipoVenta) ? b.tipoVenta : null
  const egresoDirectiva = num(b.egresoDirectiva)
  // Reparto de vendedores: [{ nombre, pct }]. El % total sale de la suma.
  const vendedoresSplit: { nombre: string; pct: number }[] = Array.isArray(b.vendedoresSplit)
    ? b.vendedoresSplit
        .map((v: any) => ({ nombre: String(v?.nombre ?? '').trim(), pct: num(v?.pct) }))
        .filter((v: any) => v.nombre)
    : []
  const vendedorPct = vendedoresSplit.length
    ? Math.round(vendedoresSplit.reduce((s, v) => s + v.pct, 0) * 100) / 100
    : num(b.vendedorPct)
  const montoBase = precioVenta - comisionMonto
  const comisionVendedor = Math.round(montoBase * vendedorPct) / 100
  // Lo que queda de la comisión bruta (descontando al vendedor) va al centro de costo.
  const ingresoCentroCosto = Math.round((comisionMonto - comisionVendedor) * 100) / 100
  // Lo que queda de la directiva (monto base − egreso directiva − pólizas/obsequio/alfombras) es el pote reservado.
  const egresosMenores = polizaCarro + polizaVida + obsequioClientes + alfombras
  const poteDirectiva = Math.round((montoBase - egresoDirectiva - egresosMenores) * 100) / 100

  // Referencias opcionales (proforma/cotización/cliente) desde la proforma de la venta.
  let proformaId: string | null = b.proformaId ?? null
  let cotizacionId: string | null = b.cotizacionId ?? null
  let clienteId: string | null = b.clienteId ?? null
  if (!proformaId) {
    const { data: pro } = await supabase
      .from('proformas')
      .select('id, cotizacion_id, cliente_id')
      .eq('vehiculo_id', vehiculoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (pro) { proformaId = pro.id; cotizacionId = cotizacionId ?? pro.cotizacion_id; clienteId = clienteId ?? pro.cliente_id }
  }

  const row = {
    vehiculo_id: vehiculoId,
    proforma_id: proformaId,
    cotizacion_id: cotizacionId,
    cliente_id: clienteId,
    precio_venta: precioVenta,
    pago_vehimotors: pagoVM,
    comision_pct: comisionPct,
    comision_monto: comisionMonto,
    monto_proforma: montoProforma,
    poliza_carro: polizaCarro,
    poliza_vida: polizaVida,
    obsequio_clientes: obsequioClientes,
    alfombras: alfombras,
    tipo_venta: tipoVenta,
    vendedor_pct: vendedorPct,
    comision_vendedor: comisionVendedor,
    egreso_directiva: egresoDirectiva,
    vendedores_split: vendedoresSplit.length ? vendedoresSplit : null,
    ingreso_centro_costo: ingresoCentroCosto,
    pote_directiva: poteDirectiva,
    vendedora: (b.vendedora ?? '').toString().trim() || null,
    reportado_vm: !!b.reportadoVm,
    notas: (b.notas ?? '').toString().trim() || null,
    actualizado_por: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ventas_division_contable')
    .upsert(row, { onConflict: 'vehiculo_id' })
    .select()
    .single()

  if (error) {
    console.error('[ventas-division] upsert error:', error)
    return NextResponse.json({ error: 'No se pudo guardar la división' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, division: data })
}
