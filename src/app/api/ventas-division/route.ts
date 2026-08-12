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

  const r2 = (n: number) => Math.round(n * 100) / 100
  const precioVenta = num(b.precioVenta)
  const comisionPct = num(b.comisionPct)                              // % comisión de venta
  const comisionMonto = r2(precioVenta * comisionPct / 100)           // monto comisión de venta (= ingreso bruto venta)
  const montoProforma = num(b.montoProforma)                          // monto proforma oriental
  const pagoVM = num(b.pagoVehimotors)                                // pagado a Vehimotors
  const polizaCarro = num(b.polizaCarro)
  const polizaVida = num(b.polizaVida)
  const obsequioClientes = num(b.obsequioClientes)
  const alfombras = num(b.alfombras)
  const papelAhumado = num(b.papelAhumado)
  const gastoAdministrativo = num(b.gastoAdministrativo)

  const TIPOS_VENTA = ['contado', 'credito_vehimotors', 'credito_banca_nacional', 'credito_financiadora_interno']
  const tipoVenta = TIPOS_VENTA.includes(b.tipoVenta) ? b.tipoVenta : null
  const montoBase = precioVenta - comisionMonto                       // monto base de Jetplus
  const comisionVendedoresPct = num(b.comisionVendedoresPct)
  const comisionVendedoresMonto = r2(montoBase * comisionVendedoresPct / 100)
  const comisionDirectivaPct = num(b.comisionDirectivaPct)
  const comisionDirectivaMonto = r2(montoBase * comisionDirectivaPct / 100)
  // Reparto del pool de comisión de vendedores: [{ nombre, pct }] (pct = % del pool, suma 100).
  const vendedoresSplit: { nombre: string; pct: number }[] = Array.isArray(b.vendedoresSplit)
    ? b.vendedoresSplit
        .map((v: any) => ({ nombre: String(v?.nombre ?? '').trim(), pct: num(v?.pct) }))
        .filter((v: any) => v.nombre)
    : []

  // Cuadro resumen en 3 bloques (dibujo de dirección):
  // A) Ingreso bruto oriental = monto proforma oriental − pagado a Vehimotors
  const ingresoBrutoOriental = r2(montoProforma - pagoVM)
  // B) A ORIENTAL → Ingreso neto venta = comisión de venta − comisión vendedores − comisión directiva (va a contabilidad)
  const ingresoNetoVenta = r2(comisionMonto - comisionVendedoresMonto - comisionDirectivaMonto)
  // C) A DIRECTIVA = ingreso bruto oriental − ingreso bruto venta (comisión de venta), menos egresos → Ingreso bóveda
  const egresosDirectiva = polizaCarro + polizaVida + obsequioClientes + alfombras + papelAhumado + gastoAdministrativo
  const poteDirectiva = r2(ingresoBrutoOriental - comisionMonto - egresosDirectiva)  // ingreso bóveda ("la bolsa")

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
    papel_ahumado: papelAhumado,
    gasto_administrativo: gastoAdministrativo,
    tipo_venta: tipoVenta,
    comision_vendedores_pct: comisionVendedoresPct,
    comision_vendedores_monto: comisionVendedoresMonto,
    comision_directiva_pct: comisionDirectivaPct,
    comision_directiva_monto: comisionDirectivaMonto,
    vendedores_split: vendedoresSplit.length ? vendedoresSplit : null,
    ingreso_neto_venta: ingresoNetoVenta,
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
