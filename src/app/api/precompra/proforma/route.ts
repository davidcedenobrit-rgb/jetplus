export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100

// Serie de garantía según el modelo (para resaltar la fila en el Anexo A).
function serieCobertura(marca: string, modelo: string): string | null {
  const m = `${marca} ${modelo}`.toUpperCase()
  if (m.includes('MG')) return 'MG (VIN > 2025)'
  if (/\bD\d/.test(m) || /MAXUS.*\bD\b/.test(m)) return 'Maxus Series D'
  if (/\b(H|K)\d/.test(m)) return 'Maxus Series H, K'
  // T60/T70/V80/S/C/G y demás Maxus
  if (m.includes('MAXUS') || /\bT\d0|\bV\d0|\bC\d00|\bG\d0|\bS\d0/.test(m)) return 'Maxus Series T, V, S, C, G'
  return null
}

export async function GET() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('precompra_proformas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const supabase = await createAdminClient()

  // Datos que llegan de la cotización (arrastrados) + completados en la proforma.
  const cotizacionId = b.cotizacionId ?? null
  let cot: Record<string, any> | null = null
  if (cotizacionId) {
    const { data } = await supabase.from('cotizaciones').select('*').eq('id', cotizacionId).maybeSingle()
    cot = data
    if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    if (cot.plan !== 'ac500') return NextResponse.json({ error: 'La cotización no es del plan Asegúrate $500' }, { status: 400 })
  }

  const tipoPersona = b.tipoPersona === 'juridica' ? 'juridica' : 'natural'
  const nombre = String(b.clienteNombre ?? cot?.cliente_nombre ?? '').trim()
  const cedula = String(b.clienteCedula ?? cot?.cliente_cedula ?? (tipoPersona === 'natural' ? cot?.cliente_ci_rif : '') ?? '').trim()
  // Natural: la identidad es la cédula, no lleva RIF. Jurídica: RIF de la empresa.
  const rif = tipoPersona === 'juridica'
    ? String(b.clienteRif ?? cot?.cliente_rif ?? cot?.cliente_ci_rif ?? '').trim()
    : String(b.clienteRif ?? cot?.cliente_rif ?? '').trim()
  const direccion = String(b.clienteDireccion ?? cot?.cliente_direccion ?? '').trim()
  const telefono = String(b.clienteTelefono ?? cot?.cliente_telefono ?? '').trim()
  const correo = String(b.clienteCorreo ?? cot?.cliente_correo ?? '').trim()
  const estadoCivil = String(b.estadoCivil ?? '').trim()
  const casado = /casad/i.test(estadoCivil)
  const conyuge = casado ? {
    nombre: String(b.conyuge?.nombre ?? '').trim(),
    cedula: String(b.conyuge?.cedula ?? '').trim(),
    rif: String(b.conyuge?.rif ?? '').trim(),
  } : null
  const registroMercantil = tipoPersona === 'juridica' ? String(b.registroMercantil ?? '').trim() : null
  const colores = String(b.colores ?? cot?.color ?? '').trim()
  const marca = String(cot?.marca ?? b.marca ?? '').trim()
  const modelo = String(cot?.modelo ?? b.modelo ?? '').trim()
  const meses = num(cot?.ac500_meses ?? b.meses) || null

  // Validación de completitud (bloquea si faltan datos indispensables).
  const faltan: string[] = []
  if (!nombre) faltan.push('nombre')
  if (!cedula) faltan.push(tipoPersona === 'juridica' ? 'cédula del firmante' : 'cédula')
  if (tipoPersona === 'juridica' && !rif) faltan.push('RIF de la empresa')
  if (!direccion) faltan.push('dirección')
  if (!telefono) faltan.push('teléfono')
  if (!correo) faltan.push('correo')
  if (!estadoCivil) faltan.push('estado civil')
  if (casado && (!conyuge?.nombre || !conyuge?.cedula || !conyuge?.rif)) faltan.push('datos del cónyuge')
  if (tipoPersona === 'juridica' && !registroMercantil) faltan.push('registro mercantil')
  if (!colores) faltan.push('color(es)')
  if (faltan.length) {
    return NextResponse.json({ error: `Faltan datos para la proforma: ${faltan.join(', ')}.`, faltan }, { status: 400 })
  }

  // Cronograma desde la cotización AC500: ac500_cuotas = [c1..cN], reserva = total_inicial.
  const cuotasCot: number[] = Array.isArray(cot?.ac500_cuotas) ? cot!.ac500_cuotas.map(num) : (Array.isArray(b.cuotas) ? b.cuotas.map(num) : [])
  const reserva = num(cot?.total_inicial ?? b.reserva ?? 500) || 500
  const cuotaFinal = cuotasCot.length ? r2(cuotasCot[cuotasCot.length - 1]) : num(b.cuotaFinal)
  const cuotasBase: number[] = cuotasCot.length ? cuotasCot.slice(0, -1).map(r2) : (Array.isArray(b.cuotasBase) ? b.cuotasBase.map(num) : [])
  const valorVenta = r2(reserva + cuotasBase.reduce((s: number, m: number) => s + m, 0))
  const totalPagar = r2(valorVenta + cuotaFinal)

  // Ciclo: lo indica dirección; por defecto el mes de la fecha del plan.
  const fechaPlan = String(b.fechaPlan ?? cot?.fecha ?? '').slice(0, 10) || null
  let ciclo = num(b.ciclo)
  if (!ciclo && fechaPlan) ciclo = Number(fechaPlan.slice(5, 7)) || null as unknown as number

  // Vincular cliente por cédula/RIF si existe.
  let clienteId: string | null = b.clienteId ?? null
  if (!clienteId && (cedula || rif)) {
    const ident = (rif || cedula).toUpperCase()
    const { data: cli } = await supabase.from('clientes').select('id').ilike('cedula_rif', ident).limit(1).maybeSingle()
    clienteId = cli?.id ?? null
  }

  const row = {
    cotizacion_id: cotizacionId,
    cliente_id: clienteId,
    concesionario_id: cot?.concesionario_id ?? 'la-oriental',
    tipo_persona: tipoPersona,
    cliente_nombre: nombre,
    cliente_cedula: cedula || null,
    cliente_rif: rif || null,
    cliente_direccion: direccion || null,
    cliente_telefono: telefono || null,
    cliente_correo: correo || null,
    estado_civil: estadoCivil || null,
    conyuge: conyuge && (conyuge.nombre || conyuge.cedula || conyuge.rif) ? conyuge : null,
    registro_mercantil: registroMercantil,
    marca: marca || null,
    modelo: modelo || null,
    unidad: modelo || null,
    colores: colores || null,
    meses,
    ciclo: ciclo || null,
    fecha_plan: fechaPlan,
    reserva,
    cuotas: cuotasBase,
    cuota_final: cuotaFinal,
    valor_venta: valorVenta,
    total_pagar: totalPagar,
    serie_cobertura: serieCobertura(marca, modelo),
    vendedor_id: b.vendedorId ?? null,
    vendedor_nombre: String(b.vendedorNombre ?? '').trim() || null,
    estado: 'completa',
    notas: String(b.notas ?? '').trim() || null,
    creado_por: user.id,
    updated_at: new Date().toISOString(),
  }

  let result
  if (b.id) {
    result = await supabase.from('precompra_proformas').update(row).eq('id', b.id).select().single()
  } else {
    result = await supabase.from('precompra_proformas').insert(row).select().single()
  }
  if (result.error) {
    console.error('[precompra/proforma] error:', result.error)
    return NextResponse.json({ error: 'No se pudo guardar la proforma' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, proforma: result.data })
}
