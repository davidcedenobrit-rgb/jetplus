export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { enviarReporteVehimotors } from '@/lib/email-ingresos'

export async function GET() {
  try {
    await enviarReporteVehimotors({
      ingresoId: 'test-000',
      token: 'tokentest123abc',
      numeroRecibo: 'LOA-REC-2026-000001',
      clienteNombre: 'Carlos Martínez Pérez',
      clienteCedula: 'V-12.345.678',
      clienteTelefono: '+58 412-555-0000',
      placa: 'AB123CD',
      concepto: 'Cuota de inicial — MG ZS 2024',
      monto: 3500,
      moneda: 'USD',
      metodoPago: 'Zelle',
      referencia: 'ZL-20260606-9871',
      banco: 'Bank of America',
      comprobantesUrls: [],
    })

    return NextResponse.json({ ok: true, mensaje: 'Correo de prueba enviado a rojasjgx@gmail.com y davidcedenobrit@gmail.com' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
