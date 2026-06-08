export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarReciboCliente } from '@/lib/email-ingresos'
import { fetchECData } from '@/lib/ingreso-ec-data'

const TEST_INGRESO_ID = '810f4ec7-ab58-4f36-9844-3b9dbfd4097a'
const TEST_CORREO = 'davidcedenobrit@gmail.com'

export async function GET() {
  const supabase = await createClient()

  const { data: ingreso } = await supabase
    .from('ingresos')
    .select('*, clientes(nombre, cedula_rif, telefono, correo, ciudad)')
    .eq('id', TEST_INGRESO_ID)
    .single()

  if (!ingreso) return NextResponse.json({ error: 'Ingreso de prueba no encontrado' }, { status: 404 })

  const cliente = (ingreso as any).clientes

  let vehiculo: any = null
  if (ingreso.vehiculo_id) {
    const { data: v } = await supabase
      .from('vehiculos')
      .select('marca, modelo, version, anio, placa')
      .eq('id', ingreso.vehiculo_id)
      .single()
    vehiculo = v
  }

  const ec = await fetchECData(TEST_INGRESO_ID, ingreso.vehiculo_id ?? null)

  try {
    await enviarReciboCliente({
      clienteNombre: cliente?.nombre ?? '',
      clienteCorreo: TEST_CORREO,
      clienteCedula: cliente?.cedula_rif ?? null,
      clienteTelefono: cliente?.telefono ?? null,
      clienteCiudad: cliente?.ciudad ?? null,
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
    return NextResponse.json({ ok: true, mensaje: `Correo con PDF completo enviado a ${TEST_CORREO}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
