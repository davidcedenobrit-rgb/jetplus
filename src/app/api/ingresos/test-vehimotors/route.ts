export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { enviarReporteVehimotors } from '@/lib/email-ingresos'

export async function GET() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })
  try {
    console.log('[test-vehimotors] Iniciando envío de correo de prueba...')
    await enviarReporteVehimotors({
      ingresoId: 'test-000',
      token: 'tokentest123abc',
      numeroRecibo: 'JPLUS-REC-2026-000001',
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
      comprobantesUrls: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      ],
    })

    return NextResponse.json({ ok: true, mensaje: 'Correo de prueba enviado a davidcedenobrit@gmail.com y davidcedenobrit@gmail.com' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
