export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// Registro liviano de una venta: deja constancia en `vehiculos` (aparece en
// "Ventas registradas") pero NO genera ingresos, creditos, cuotas, ni toca
// showroom/proformas/division contable — eso se completa despues a mano
// desde "Definir utilidad" cuando se quiera procesar la venta completa.
export async function POST(req: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const clienteNombre = clip(b.clienteNombre, 150)
  const clienteCedula = clip(b.clienteCedula, 30)
  const marca = clip(b.marca, 10)
  const modelo = clip(b.modelo, 120)
  const placa = clip(b.placa, 20)
  const observaciones = clip(b.observaciones, 500)
  const tipoCompra = clip(b.tipoCompra, 30) || 'contado'
  const precioTotal = Number(b.precioTotal)

  if (clienteNombre.length < 2 || clienteCedula.length < 3) {
    return NextResponse.json({ error: 'Nombre y cédula/RIF del cliente son obligatorios' }, { status: 400 })
  }
  if (!['MG', 'MAXUS'].includes(marca)) {
    return NextResponse.json({ error: 'Marca inválida' }, { status: 400 })
  }
  if (modelo.length < 1) {
    return NextResponse.json({ error: 'El modelo es obligatorio' }, { status: 400 })
  }
  if (!Number.isFinite(precioTotal) || precioTotal <= 0) {
    return NextResponse.json({ error: 'Precio de venta inválido' }, { status: 400 })
  }
  if (!['contado', 'credito'].includes(tipoCompra)) {
    return NextResponse.json({ error: 'Forma de pago inválida' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  let clienteId: string
  const { data: existente } = await supabase.from('clientes').select('id').eq('cedula_rif', clienteCedula).maybeSingle()
  if (existente) {
    clienteId = existente.id
  } else {
    const { data: nuevo, error: errCliente } = await supabase
      .from('clientes')
      .insert({ nombre: clienteNombre, cedula_rif: clienteCedula })
      .select('id')
      .single()
    if (errCliente || !nuevo) return NextResponse.json({ error: 'No se pudo registrar el cliente' }, { status: 500 })
    clienteId = nuevo.id
  }

  const { data: vehiculo, error } = await supabase
    .from('vehiculos')
    .insert({
      cliente_id: clienteId,
      marca, modelo,
      placa: placa || null,
      precio_total: precioTotal,
      tipo_compra: tipoCompra,
      observaciones: observaciones ? `⚡ Registro rápido — ${observaciones}` : '⚡ Registro rápido',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'No se pudo registrar la venta' }, { status: 500 })
  return NextResponse.json({ ok: true, id: vehiculo.id })
}
