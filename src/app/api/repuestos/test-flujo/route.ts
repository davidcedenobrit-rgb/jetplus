export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarSolicitudCotizacion } from '@/lib/email-repuestos'

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Generar número y token únicos
  const numero = `SORE-PRUEBA-${Date.now().toString().slice(-6)}`
  const token  = crypto.randomUUID()

  // 2. Crear solicitud en estado cotizacion_enviada (para que pueda recibir respuesta)
  const { data: solicitud, error: errSol } = await supabase
    .from('solicitudes_repuestos')
    .insert({
      numero,
      estado: 'cotizacion_enviada',
      token_respuesta: token,
      solicitado_por_email: '🧪 SOLICITUD DE PRUEBA',
    })
    .select('id, numero, token_respuesta')
    .single()

  if (errSol || !solicitud) {
    return NextResponse.json({ error: 'Error creando solicitud', detail: errSol?.message }, { status: 500 })
  }

  // 3. Insertar 3 items de prueba
  const items = [
    { descripcion: 'Filtro de aceite MG ZS 1.5T',         referencia: 'LQJ100U8250A', cantidad: 2 },
    { descripcion: 'Pastillas freno delanteras Maxus T60', referencia: 'MCB-T60-D22',  cantidad: 1 },
    { descripcion: 'Correa de distribución ZS EV',         referencia: 'LQB130001000', cantidad: 1 },
  ]

  const { data: itemsCreados, error: errItems } = await supabase
    .from('repuestos_items')
    .insert(items.map(it => ({ ...it, solicitud_id: solicitud.id })))
    .select('id, descripcion, referencia, cantidad')

  if (errItems) {
    return NextResponse.json({ error: 'Error creando items', detail: errItems.message }, { status: 500 })
  }

  // 4. Enviar el correo SOLO al destinatario de prueba (sin CC al equipo interno)
  try {
    await enviarSolicitudCotizacion({
      solicitudId: solicitud.id,
      numero: solicitud.numero,
      token: solicitud.token_respuesta,
      items: itemsCreados ?? items,
      destinatariosOverride: [to],
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Error enviando correo', detail: String(e?.message ?? e) }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodemando.laoriental.co'

  return NextResponse.json({
    ok: true,
    mensaje: `Solicitud de prueba ${numero} creada y enviada a ${to}`,
    solicitud: {
      id: solicitud.id,
      numero: solicitud.numero,
      destinatario: to,
    },
    urls_botones_correo: {
      hay_todo:  `${baseUrl}/api/repuestos/respuesta?id=${solicitud.id}&token=${token}&tipo=hay_todo`,
      parcial:   `${baseUrl}/api/repuestos/respuesta?id=${solicitud.id}&token=${token}&tipo=parcial`,
      no_hay:    `${baseUrl}/api/repuestos/respuesta?id=${solicitud.id}&token=${token}&tipo=no_hay`,
    },
    instrucciones: [
      `1. Abre tu Gmail (${to}) y busca el correo "Solicitud de cotización ${numero}".`,
      `2. Click derecho en el botón "✅ Sí, hay todo" → "Copiar dirección del enlace".`,
      `3. Compara el link copiado con "urls_botones_correo.hay_todo" de esta respuesta.`,
      `4. Si NO son iguales, alguien (Gmail/Resend/proxy) está reescribiendo el link.`,
      `5. Para limpiar al terminar: ve a /repuestos en el dashboard, busca ${numero} y elimina la tarjeta.`,
    ],
  })
}
