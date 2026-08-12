export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { POST as crearCotizacion } from '../route'

/**
 * Endpoint de PRUEBA para enviar una cotización de test por correo.
 *
 * Uso (abrir en el navegador estando logueado en el Centro de Mando):
 *   /api/cotizaciones/test-envio
 *   /api/cotizaciones/test-envio?email=otro@correo.com&modalidad=credito_24
 *
 * Reutiliza el flujo real (mismo PDF, guardado y enlace de aceptar), así
 * que sirve para validar el logo, el texto legal y el botón "Acepto".
 * Requiere sesión (solo personal), igual que el resto de /api.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión en el Centro de Mando y vuelve a abrir este enlace.' }, { status: 401 })
  }

  const url = new URL(req.url)
  // Destino fijo: evita que el endpoint interno pueda enviar pruebas a terceros.
  const email = 'davidcedenobrit@gmail.com'
  const modalidad = url.searchParams.get('modalidad') || 'credito_24'
  const plan = url.searchParams.get('plan') || 'vehimotors'
  let vehiculoId = url.searchParams.get('vehiculoId')

  // Si no se indica vehículo, toma el primero disponible del catálogo.
  if (!vehiculoId) {
    const { data: veh } = await supabase
      .from('catalogo_ventas')
      .select('id')
      .eq('disponible', true)
      .order('orden')
      .limit(1)
      .maybeSingle()
    if (!veh) {
      return NextResponse.json({ error: 'No hay vehículos disponibles en el catálogo para la prueba.' }, { status: 404 })
    }
    vehiculoId = veh.id
  }

  const body = {
    codigo: 'R000',
    vehiculoId,
    clienteNombre: 'PRUEBA — Cotización de test',
    clienteCiRif: 'V-00000000',
    clienteCorreo: email,
    clienteTelefono: null,
    clienteDireccion: null,
    clienteCiudadEstado: 'Porlamar - Nueva Esparta',
    clienteCodigoPostal: null,
    agenteRetencion: false,
    modalidad,
    plan,
  }

  // Reutiliza el endpoint real de generación/envío. createClient() dentro de
  // POST lee las mismas cookies de sesión, así que la autenticación se mantiene.
  const fakeReq = new Request(`${url.origin}/api/cotizaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const res = await crearCotizacion(fakeReq)
  const resultado = await res.json().catch(() => ({}))

  return NextResponse.json(
    { prueba: true, enviadoA: email, modalidad, plan, vehiculoId, resultado },
    { status: res.status },
  )
}
