export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { enviarReciboCliente } from '@/lib/email-ingresos'

export async function GET() {
  try {
    await enviarReciboCliente({
      clienteNombre: 'Pierre Mikhael El Kareh',
      clienteCorreo: 'davidcedenobrit@gmail.com',
      numeroRecibo: 'LOA-REC-2026-00001',
      concepto: 'Cuota de inicial — MG ZS AT LUX 2026',
      monto: 2496.40,
      moneda: 'USD',
      metodoPago: 'USDT JR',
      referencia: '43566840560055296',
      fechaPago: '2026-06-06',
    })
    return NextResponse.json({ ok: true, mensaje: 'Correo de prueba enviado a davidcedenobrit@gmail.com' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
