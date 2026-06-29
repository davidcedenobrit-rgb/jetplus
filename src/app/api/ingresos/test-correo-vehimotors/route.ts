export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { enviarReporteLoteVehimotors, type ReporteLoteItem } from '@/lib/email-ingresos'

const TEST_SECRET = process.env.TEST_EMAIL_SECRET ?? 'prueba-sore-2026'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('s')
  if (secret !== TEST_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const to = req.nextUrl.searchParams.get('to')
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Falta parámetro "to" con un correo válido' }, { status: 400 })
  }

  // Tipo de prueba: ?tipo=individual o ?tipo=lote (default: lote)
  const tipo = req.nextUrl.searchParams.get('tipo') === 'individual' ? 'individual' : 'lote'

  const hoy = new Date().toISOString().split('T')[0]
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const anteayer = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]

  const itemsLote: ReporteLoteItem[] = [
    {
      fechaPago: hoy,
      proforma: 'S05750',
      placa: 'AC019HN',
      vehiculoLabel: 'MAXUS T60 · AC019HN',
      clienteNombre: 'MARYORY ANDREINA ARAUJO RONDON',
      cedulaRif: 'V-18619847',
      concepto: 'Cuota de vehículo · Vehimotors',
      consesionario: 'LA ORIENTAL',
      montoUSD: 280.35,
      bancoVehimotors: 'Transferencia bancaria',
      referencia: '1130058970',
      numeroRecibo: 'LOA-REC-2026-00010',
      observaciones: null,
    },
    {
      fechaPago: ayer,
      proforma: 'S05892',
      placa: 'A0951DB',
      vehiculoLabel: 'MG ZS · A0951DB',
      clienteNombre: 'HERMES GENARO SALAZAR PEREZ',
      cedulaRif: 'V-19448717',
      concepto: 'Inicial de vehículo',
      consesionario: 'LA ORIENTAL',
      montoUSD: 2000.00,
      bancoVehimotors: 'USDT VE',
      referencia: 'fb23386b7d',
      numeroRecibo: 'LOA-REC-2026-00023',
      observaciones: null,
    },
    {
      fechaPago: anteayer,
      proforma: 'S05433',
      placa: 'A0295PA',
      vehiculoLabel: 'MG3 1.5L AT · A0295PA',
      clienteNombre: 'DANNY DANIELS LUNA PRADO',
      cedulaRif: 'V-11789159',
      concepto: 'Cuota de vehículo',
      consesionario: 'LA ORIENTAL',
      montoUSD: 950.00,
      bancoVehimotors: 'Efectivo USD',
      referencia: '—',
      numeroRecibo: 'LOA-REC-2026-00011',
      observaciones: 'Pago en efectivo recibido en oficina Maturín',
    },
    {
      fechaPago: anteayer,
      proforma: 'S05210',
      placa: '—',
      vehiculoLabel: null,
      clienteNombre: 'NERIS RAMON SALAZAR',
      cedulaRif: 'V-11378761',
      concepto: 'Abono cuota 4 — ASEGÚRATE 500',
      consesionario: 'LA ORIENTAL',
      montoUSD: 900.00,
      bancoVehimotors: 'Efectivo USD',
      referencia: '—',
      numeroRecibo: 'LOA-REC-2026-00026',
      observaciones: null,
    },
  ]

  const items = tipo === 'individual' ? [itemsLote[0]] : itemsLote

  try {
    await enviarReporteLoteVehimotors({
      items,
      resumenTexto: '🧪 CORREO DE PRUEBA — Estos datos NO corresponden a reportes reales. No requieren acción.',
      destinatariosOverride: [to],
    })

    return NextResponse.json({
      ok: true,
      mensaje: `Correo de prueba enviado a ${to}`,
      destinatario: to,
      tipo,
      cantidad_items: items.length,
      total_usd: items.reduce((s, i) => s + i.montoUSD, 0).toFixed(2),
      instrucciones: 'Revisa tu Gmail/Outlook. El subject empieza con [PRUEBA]. El formato es el mismo que recibirá Vehimotors en producción.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
