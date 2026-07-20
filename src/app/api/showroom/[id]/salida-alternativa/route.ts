export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const ROLES = ['jose', 'admin', 'director']
const ALIADOS = ['ki_auto', 'autosurca'] as const

// Concesionarios destino con su propia base de datos (para copiar el carro allá).
// Las llaves se configuran por variables de entorno en el proyecto de La Oriental.
function targetConcesionario(nombre: string): { url: string; key: string } | null {
  const n = nombre.toLowerCase().replace(/\s+/g, '')
  if (n.includes('kiauto') && process.env.CONCESIONARIO_KIAUTO_URL && process.env.CONCESIONARIO_KIAUTO_SERVICE_KEY) {
    return { url: process.env.CONCESIONARIO_KIAUTO_URL, key: process.env.CONCESIONARIO_KIAUTO_SERVICE_KEY }
  }
  return null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = usuario?.rol ?? ''
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id: showroomId } = await params
  const body = await req.json().catch(() => ({}))
  const { tipo, destinatario, notas } = body ?? {}

  const admin = await createAdminClient()

  const { data: sr } = await admin
    .from('vehiculos_showroom')
    .select('id, estado, marca, modelo, version, anio, color, placa, vin, serial_motor, proforma_vehimotors')
    .eq('id', showroomId)
    .single()
  if (!sr) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
  if (sr.estado === 'vendido') return NextResponse.json({ error: 'El vehículo ya está vendido' }, { status: 400 })

  const update: Record<string, any> = {
    estado: 'vendido',
    updated_at: new Date().toISOString(),
  }
  let notaHist = ''

  if (tipo === 'transferido') {
    const nombre = String(destinatario ?? '').trim()
    if (!nombre) return NextResponse.json({ error: 'Escribe a quién se transfirió' }, { status: 400 })
    update.transferido_a = nombre
    update.transferido_at = new Date().toISOString()
    notaHist = `Salida por transferencia a: ${nombre}${notas ? ' — ' + notas : ''}`
  } else if (tipo === 'aliado') {
    if (!ALIADOS.includes(destinatario)) {
      return NextResponse.json({ error: 'Aliado inválido' }, { status: 400 })
    }
    update.vendido_por_aliado = destinatario
    update.vendido_por_aliado_at = new Date().toISOString()
    const label = destinatario === 'ki_auto' ? 'Ki Auto' : 'Autosurca'
    notaHist = `Vendido por aliado: ${label}${notas ? ' — ' + notas : ''}`
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { error: upErr } = await admin
    .from('vehiculos_showroom')
    .update(update)
    .eq('id', showroomId)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  await admin.from('showroom_historial').insert({
    showroom_vehiculo_id: showroomId,
    estado_anterior: sr.estado,
    estado_nuevo: 'vendido',
    usuario_email: user.email ?? null,
    notas: notaHist,
  })

  // Sincronización entre concesionarios: si se transfiere a otro concesionario
  // con base propia (ej. Ki Auto), el carro se crea en su showroom automáticamente
  // y se arrastran sus documentos (Documentos preventa).
  let sincronizado = false
  let documentosCopiados = 0
  if (tipo === 'transferido') {
    const target = targetConcesionario(String(destinatario ?? ''))
    if (target) {
      try {
        const dest = createServiceClient(target.url, target.key)
        const placa = (sr.placa ?? '').trim() || null
        const vin = (sr.vin ?? '').trim() || null
        // Ubicar el carro en el destino (por VIN o placa) para no duplicarlo.
        let destVehId: string | null = null
        if (vin || placa) {
          const filtro = [vin ? `vin.eq.${vin}` : null, placa ? `placa.eq.${placa}` : null].filter(Boolean).join(',')
          const { data: dup } = await dest.from('vehiculos_showroom').select('id').or(filtro).limit(1)
          if (dup && dup.length) destVehId = dup[0].id
        }
        if (destVehId) {
          // Ya estaba cargado en Ki Auto: se considera sincronizado.
          sincronizado = true
        } else {
          const { data: nuevoVeh, error: insErr } = await dest.from('vehiculos_showroom').insert({
            marca: sr.marca, modelo: sr.modelo, version: sr.version ?? null, anio: sr.anio ?? null,
            color: sr.color ?? null, placa, vin, serial_motor: (sr.serial_motor ?? '').trim() || null,
            proforma_vehimotors: sr.proforma_vehimotors ?? null,
            estado: 'en_agencia', ubicacion: 'showroom',
            fecha_llegada: new Date().toISOString().slice(0, 10),
            observaciones: 'Transferido desde La Oriental',
          }).select('id').single()
          // .insert() no lanza excepción: devuelve { error }. Solo marcamos
          // sincronizado cuando la fila se creó realmente en el destino.
          if (insErr || !nuevoVeh) {
            console.error('[salida-alternativa] fallo al crear el carro en Ki Auto:', insErr?.message)
          } else {
            destVehId = nuevoVeh.id
            sincronizado = true
          }
        }

        // Arrastrar los documentos del carro (tabla archivos) al carro del destino.
        if (destVehId) {
          const { data: docs } = await admin
            .from('archivos')
            .select('tipo, url, nombre')
            .eq('showroom_vehiculo_id', showroomId)
          if (docs && docs.length) {
            const { data: yaHay } = await dest
              .from('archivos')
              .select('url')
              .eq('showroom_vehiculo_id', destVehId)
            const urlsExistentes = new Set((yaHay ?? []).map((a: any) => a.url))
            const nuevos = docs
              .filter((d: any) => d.url && !urlsExistentes.has(d.url))
              .map((d: any) => ({
                tipo: d.tipo, url: d.url, nombre: d.nombre ?? null,
                showroom_vehiculo_id: destVehId, subido_por: null,
              }))
            if (nuevos.length) {
              const { error: docErr } = await dest.from('archivos').insert(nuevos)
              if (docErr) console.error('[salida-alternativa] fallo copiando documentos:', docErr.message)
              else documentosCopiados = nuevos.length
            }
          }
        }
      } catch (e) {
        console.error('[salida-alternativa] error al sincronizar transferencia:', e)
      }
    }
  }

  return NextResponse.json({ ok: true, sincronizado, documentosCopiados })
}
