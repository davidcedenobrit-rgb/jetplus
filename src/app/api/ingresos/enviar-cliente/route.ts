export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarReciboCliente } from '@/lib/email-ingresos'
import { fetchECData } from '@/lib/ingreso-ec-data'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROL_PERMITIDO.includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  let body: { ingresoId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { ingresoId } = body
  if (!ingresoId) return NextResponse.json({ error: 'ingresoId requerido' }, { status: 400 })

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif, telefono, correo, ciudad)')
    .eq('id', ingresoId)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })

  const cliente = (ingreso as any).clientes
  if (!cliente?.correo) {
    return NextResponse.json({ error: 'El cliente no tiene correo registrado' }, { status: 400 })
  }

  // Vehículo vinculado (opcional)
  let vehiculo: any = null
  if (ingreso.vehiculo_id) {
    const { data: v } = await supabase
      .from('vehiculos')
      .select('marca, modelo, version, anio, placa')
      .eq('id', ingreso.vehiculo_id)
      .single()
    vehiculo = v
  }

  const ec = await fetchECData(ingresoId, ingreso.vehiculo_id ?? null, (ingreso as any).acuerdo_inicial_id ?? null)

  try {
    await enviarReciboCliente({
      clienteNombre: cliente.nombre,
      clienteCorreo: cliente.correo,
      clienteCedula: cliente.cedula_rif ?? null,
      clienteTelefono: cliente.telefono ?? null,
      clienteCiudad: cliente.ciudad ?? null,
      numeroRecibo: ingreso.numero_recibo,
      concepto: ingreso.concepto,
      monto: Number(ingreso.monto),
      moneda: ingreso.moneda,
      tasaCambio: ingreso.tasa_cambio ? Number(ingreso.tasa_cambio) : null,
      metodoPago: ingreso.metodo_pago,
      referencia: ingreso.referencia ?? null,
      bancoEmisor: ingreso.banco_emisor ?? null,
      bancoReceptor: ingreso.banco_receptor ?? null,
      fechaPago: ingreso.fecha_pago,
      fechaAprobacion: ingreso.fecha_aprobacion ?? null,
      observaciones: ingreso.observaciones ?? null,
      vehiculoMarca: vehiculo?.marca ?? null,
      vehiculoModelo: vehiculo?.modelo ?? null,
      vehiculoVersion: vehiculo?.version ?? null,
      vehiculoAnio: vehiculo?.anio ?? null,
      placa: ingreso.placa ?? vehiculo?.placa ?? null,
      ...ec,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[enviar-cliente]', e)
    return NextResponse.json({ error: e.message ?? 'Error al enviar correo' }, { status: 500 })
  }
}
