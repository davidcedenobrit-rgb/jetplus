export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolverCotizacionDB } from '@/lib/cotizacion-federada'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100

// Arma el PREVIEW de los montos con que quedará la proforma (mismos números
// que usa /desde-cotizacion) + el desglose del acuerdo de cobro (inicial que
// paga el cliente vs. lo que financia La Oriental). Read + edit en el modal.
export async function GET(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const cotizacionId = new URL(req.url).searchParams.get('cotizacionId')
  if (!cotizacionId) return NextResponse.json({ error: 'Falta la cotización' }, { status: 400 })

  // Resuelve la base donde vive la cotización (local o la de otra sede).
  const resuelta = await resolverCotizacionDB(cotizacionId)
  if (!resuelta) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  const { db: supabase, cot } = resuelta

  const est = (cot.estructura_costos ?? {}) as Record<string, any>
  const modalidad = String(cot.modalidad ?? 'credito_24')
  const plan = String(cot.plan ?? 'vehimotors')
  const precioBase = num(cot.precio_base)
  const inicial = num(cot.total_inicial)
  const financiado = num(cot.financiamiento_monto)
  const cuotaMensual = num(cot.cuota_mensual)
  const meses = modalidad === 'contado' ? 0
    : Math.max(1, Math.round(num(est.meses) || num(cot.personalizado_meses) || num(cot.cuotas_banco) || (plan === 'ac500' ? num(cot.ac500_meses) : 0) || 24))

  // Acuerdo de cobro: doble financiamiento del inicial (lo maneja la vendedora).
  const { data: ac } = await supabase.from('acuerdos_cobro')
    .select('id, inicial_total, monto_contado, monto_financiado, num_cuotas, cuota_monto, estado')
    .eq('cotizacion_id', cotizacionId).maybeSingle()
  const acuerdo = ac ? {
    id: ac.id,
    inicialTotal: num(ac.inicial_total) || inicial,
    contado: num(ac.monto_contado),
    laOrientalFinancia: num(ac.monto_financiado),
    numCuotas: num(ac.num_cuotas),
    cuotaMonto: ac.cuota_monto != null ? num(ac.cuota_monto) : (num(ac.num_cuotas) > 0 ? r2(num(ac.monto_financiado) / num(ac.num_cuotas)) : 0),
    estado: ac.estado,
  } : null

  const tasa = num(cot.personalizado_tasa_pct) || num(est.tasaPct) || 0

  return NextResponse.json({
    vehiculo: `${cot.marca ?? ''} ${cot.modelo ?? ''}`.trim(),
    modalidad,
    precioBase,
    inicial,
    financiado,
    cuotaMensual,
    meses,
    tasa,
    acuerdo,
  })
}
