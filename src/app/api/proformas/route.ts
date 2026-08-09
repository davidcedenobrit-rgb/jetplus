export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { sedesExternas } from '@/lib/cotizacion-federada'
import { enviarProformaCliente } from '@/lib/email-proformas'

const planLabel: Record<string, string> = {
  inicial_la_oriental: 'La Oriental',
  financiamiento_vehimotors: 'Financiamiento Vehimotors',
  cuota_especial: 'Cuota Especial Vehimotors',
  asegurate_500: 'Asegúrate $500',
  credito_40_60: '40/60 Vehimotors',
}

function fmtDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')) : d
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const {
      creditoId,
      enviarCorreo,
      correoDestino,
      observaciones,
    } = body

    if (!creditoId) {
      return NextResponse.json({ error: 'creditoId requerido' }, { status: 400 })
    }
    if (enviarCorreo && (!correoDestino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correoDestino).trim()))) {
      return NextResponse.json({ error: 'Correo destino inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: credito, error: cErr } = await supabase
      .from('creditos')
      .select('*')
      .eq('id', creditoId)
      .single()

    if (cErr || !credito) {
      return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 })
    }

    if (credito.estado !== 'activo' && credito.estado !== 'mora') {
      return NextResponse.json({
        error: credito.estado === 'pagado'
          ? 'Este crédito ya está pagado en su totalidad; la proforma solo aplica para créditos con saldo pendiente'
          : 'Solo se pueden emitir proformas de créditos activos o en mora',
      }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('proformas')
      .select('id, numero')
      .eq('credito_id', creditoId)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({
        error: `Ya existe una proforma (${existente.numero}) para este crédito`,
        proformaId: existente.id,
        numero: existente.numero,
      }, { status: 409 })
    }

    const { data: cliente, error: clErr } = await supabase
      .from('clientes')
      .select('id, nombre, cedula_rif, telefono, whatsapp, direccion, correo, ciudad')
      .eq('id', credito.cliente_id)
      .single()

    if (clErr || !cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const { data: vehiculo } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, placa, color, anio, precio_total, precio_base')
      .eq('id', credito.vehiculo_id)
      .maybeSingle()

    const { data: cuotas } = await supabase
      .from('cuotas')
      .select('id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado')
      .eq('credito_id', creditoId)
      .order('numero_cuota', { ascending: true })

    const cuotasArr = cuotas ?? []
    if (cuotasArr.length === 0) {
      return NextResponse.json({ error: 'El crédito no tiene cuotas registradas' }, { status: 400 })
    }

    // Acuerdo de pago del inicial (si existe)
    const { data: acuerdo } = await supabase
      .from('acuerdos_inicial')
      .select('id, monto_acordado, monto_pagado, fecha_limite, estado, observaciones')
      .eq('credito_id', creditoId)
      .maybeSingle()

    const primeraCuota = cuotasArr[0]?.fecha_vencimiento ?? null
    const ultimaCuota = cuotasArr[cuotasArr.length - 1]?.fecha_vencimiento ?? null

    const cronogramaSnapshot = cuotasArr.map((c) => ({
      numero: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto: Number(c.monto),
      estado: c.estado,
      monto_pagado: Number(c.monto_pagado ?? 0),
    }))

    const cuotaMensual = Number(cuotasArr[0]?.monto ?? 0)
    const precioVehiculo = Number(vehiculo?.precio_total ?? vehiculo?.precio_base ?? 0) || (Number(credito.inicial) + Number(credito.monto_financiado))

    const clienteSnapshot = {
      id: cliente.id,
      nombre: cliente.nombre,
      cedula_rif: cliente.cedula_rif,
      telefono: cliente.telefono,
      whatsapp: cliente.whatsapp,
      direccion: cliente.direccion,
      correo: cliente.correo,
      ciudad: cliente.ciudad,
    }

    const vehiculoSnapshot = vehiculo ? {
      id: vehiculo.id,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      placa: vehiculo.placa,
      color: vehiculo.color,
      anio: vehiculo.anio,
      precio_total: Number(vehiculo.precio_total ?? 0),
      precio_base: Number(vehiculo.precio_base ?? 0),
    } : { placa: credito.placa }

    const creditoSnapshot = {
      id: credito.id,
      plan_tipo: credito.plan_tipo,
      monto_financiado: Number(credito.monto_financiado),
      inicial: Number(credito.inicial),
      saldo: Number(credito.saldo),
      num_cuotas: credito.num_cuotas,
      frecuencia_pago: credito.frecuencia_pago,
      fecha_inicio: credito.fecha_inicio,
      moneda: credito.moneda,
      estado: credito.estado,
      acuerdo_inicial: acuerdo ? {
        id: acuerdo.id,
        monto_acordado: Number(acuerdo.monto_acordado),
        monto_pagado: Number(acuerdo.monto_pagado ?? 0),
        saldo_por_pagar: Math.max(0, Number(acuerdo.monto_acordado) - Number(acuerdo.monto_pagado ?? 0)),
        fecha_limite: acuerdo.fecha_limite,
        estado: acuerdo.estado,
        observaciones: acuerdo.observaciones,
      } : null,
    }

    const { data: proforma, error: insertErr } = await supabase
      .from('proformas')
      .insert([{
        credito_id: creditoId,
        cliente_id: credito.cliente_id,
        vehiculo_id: credito.vehiculo_id,
        cliente_snapshot: clienteSnapshot,
        vehiculo_snapshot: vehiculoSnapshot,
        credito_snapshot: creditoSnapshot,
        cronograma_snapshot: cronogramaSnapshot,
        precio_vehiculo: precioVehiculo,
        monto_inicial: Number(credito.inicial),
        monto_financiado: Number(credito.monto_financiado),
        saldo_pendiente: Number(credito.saldo),
        num_cuotas: credito.num_cuotas,
        primera_cuota_fecha: primeraCuota,
        ultima_cuota_fecha: ultimaCuota,
        observaciones: observaciones?.trim() || null,
        correo_destino: enviarCorreo ? String(correoDestino).trim().toLowerCase() : null,
        emitida_por: authUser.id,
      }])
      .select()
      .single()

    if (insertErr || !proforma) {
      console.error('[proformas] insert error:', insertErr)
      return NextResponse.json({ error: 'Error al guardar la proforma' }, { status: 500 })
    }

    let correoEnviado = false
    let correoError: string | null = null

    if (enviarCorreo && correoDestino) {
      try {
        await enviarProformaCliente({
          proformaId: proforma.id,
          numero: proforma.numero,
          fecha: fmtDate(proforma.fecha_emision),
          correoDestino: String(correoDestino).trim().toLowerCase(),
          clienteNombre: cliente.nombre,
          marca: vehiculo?.marca ?? '',
          modelo: vehiculo?.modelo ?? '',
          placa: vehiculo?.placa ?? credito.placa ?? null,
          precioVehiculo,
          inicialPagada: Number(credito.inicial),
          saldoFinanciado: Number(credito.monto_financiado),
          cuotaMensual,
          numeroCuotas: credito.num_cuotas,
          planLabel: planLabel[credito.plan_tipo] ?? 'Crédito',
        })

        await supabase
          .from('proformas')
          .update({ correo_enviado_at: new Date().toISOString() })
          .eq('id', proforma.id)

        correoEnviado = true
      } catch (emailErr: any) {
        console.error('[proformas] email error (no bloqueante):', emailErr)
        correoError = emailErr?.message ?? 'Error al enviar el correo'
      }
    }

    return NextResponse.json({
      ok: true,
      proformaId: proforma.id,
      numero: proforma.numero,
      correoEnviado,
      correoError,
    }, { status: 201 })
  } catch (err) {
    console.error('[proformas] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const PROF_COLS = 'id, numero, fecha_emision, cliente_id, credito_id, vehiculo_id, cotizacion_id, cliente_snapshot, vehiculo_snapshot, precio_vehiculo, monto_inicial, monto_financiado, num_cuotas, vendedoras, correo_destino, correo_enviado_at, created_at'

function conTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

async function traerProformas(db: SupabaseClient, limit: number, externa = false): Promise<any[]> {
  const { data } = await db.from('proformas').select(externa ? '*' : PROF_COLS)
    .order('created_at', { ascending: false }).limit(limit)
  return (data ?? []) as any[]
}

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const creditoId = searchParams.get('credito_id')
  const clienteId = searchParams.get('cliente_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const supabase = await createAdminClient()

  // Búsqueda por id específico (credito/cliente): solo base local (esos ids son
  // referencias locales). El listado general del panel sí es federado.
  if (creditoId || clienteId) {
    let query = supabase.from('proformas').select(PROF_COLS)
      .order('created_at', { ascending: false }).limit(limit)
    if (creditoId) query = query.eq('credito_id', creditoId)
    if (clienteId) query = query.eq('cliente_id', clienteId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Panel central: proformas de la base local + las de las otras sedes.
  const externos = sedesExternas()
  const tareas: Promise<any[]>[] = [
    conTimeout(traerProformas(supabase, limit).catch(() => []), 4500, []),
    ...externos.map(a => {
      const cli = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      return conTimeout(traerProformas(cli, limit, true).catch(() => []), 4000, [])
    }),
  ]
  const todas = (await Promise.all(tareas)).flat()
  const map = new Map<string, any>()
  for (const p of todas) { const k = String(p?.id ?? ''); if (k && !map.has(k)) map.set(k, p) }
  const merged = Array.from(map.values())
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .slice(0, limit)
  return NextResponse.json(merged)
}
