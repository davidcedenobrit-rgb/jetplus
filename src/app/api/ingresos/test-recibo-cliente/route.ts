export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { enviarReciboCliente } from '@/lib/email-ingresos'

export async function GET() {
  try {
    await enviarReciboCliente({
      clienteNombre: 'Pierre Mikhael El Kareh Odabachi',
      clienteCorreo: 'davidcedenobrit@gmail.com',
      clienteCedula: 'V-31958695',
      clienteTelefono: '0424-9470580',
      clienteCiudad: 'Maturín',
      numeroRecibo: 'LOA-REC-2026-00001',
      concepto: 'Cuota de inicial — MG ZS AT LUX 2026',
      monto: 2496.40,
      moneda: 'USD',
      metodoPago: 'USDT JR',
      referencia: '43566840560055296',
      fechaPago: '2026-06-06',
      fechaAprobacion: '2026-06-06',
      vehiculoMarca: 'MG',
      vehiculoModelo: 'ZS NEW',
      vehiculoVersion: 'AT AUTOMATICO',
      vehiculoAnio: 2026,
      placa: 'A0950DB',
    })
    return NextResponse.json({ ok: true, mensaje: 'Correo con PDF adjunto enviado a davidcedenobrit@gmail.com' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
