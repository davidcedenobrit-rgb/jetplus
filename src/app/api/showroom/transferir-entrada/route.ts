export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { concesionarioExternoPorKey } from '@/lib/concesionarios-externos'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Trae un carro que está en un concesionario aliado (Ki Auto) hacia el showroom
// de Jetplus, para poder venderlo aquí. Es el inverso de salida-alternativa:
//   · crea (o reutiliza) la fila en el showroom de Jetplus,
//   · arrastra sus documentos,
//   · marca la unidad en el aliado como salida por transferencia.
// Devuelve el id del showroom local para que la venta lo use.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (usuario?.rol ?? (user.app_metadata?.rol as string)) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { origen, externoId } = body ?? {}
  if (!origen || !externoId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const target = concesionarioExternoPorKey(String(origen))
  if (!target) return NextResponse.json({ error: 'Concesionario no configurado' }, { status: 400 })

  const admin = await createAdminClient()
  const src = createServiceClient(target.url, target.serviceKey)

  // 1. Leer el carro en el aliado.
  const { data: ext } = await src
    .from('vehiculos_showroom')
    .select('id, estado, marca, modelo, version, anio, color, placa, vin, serial_motor, proforma_vehimotors')
    .eq('id', externoId)
    .single()
  if (!ext) return NextResponse.json({ error: 'Vehículo no encontrado en el aliado' }, { status: 404 })
  if (ext.estado === 'vendido') return NextResponse.json({ error: 'La unidad ya salió en el aliado' }, { status: 400 })

  const placa = (ext.placa ?? '').trim() || null
  const vin = (ext.vin ?? '').trim() || null

  // 2. Ubicar o crear la fila en el showroom de Jetplus (sin duplicar por VIN/placa).
  let localId: string | null = null
  if (vin || placa) {
    const filtro = [vin ? `vin.eq.${vin}` : null, placa ? `placa.eq.${placa}` : null].filter(Boolean).join(',')
    const { data: dup } = await admin.from('vehiculos_showroom').select('id').or(filtro).limit(1)
    if (dup && dup.length) localId = dup[0].id
  }
  if (!localId) {
    const { data: nuevo, error: insErr } = await admin.from('vehiculos_showroom').insert({
      marca: ext.marca, modelo: ext.modelo, version: ext.version ?? null, anio: ext.anio ?? null,
      color: ext.color ?? null, placa, vin, serial_motor: (ext.serial_motor ?? '').trim() || null,
      proforma_vehimotors: ext.proforma_vehimotors ?? null,
      estado: 'en_agencia', ubicacion: 'showroom',
      fecha_llegada: new Date().toISOString().slice(0, 10),
      observaciones: `Transferido desde ${target.label}`,
    }).select('id').single()
    if (insErr || !nuevo) {
      console.error('[transferir-entrada] fallo creando en Jetplus:', insErr?.message)
      return NextResponse.json({ error: 'No se pudo traer el vehículo' }, { status: 500 })
    }
    localId = nuevo.id
    await admin.from('showroom_historial').insert({
      showroom_vehiculo_id: localId,
      estado_anterior: null,
      estado_nuevo: 'en_agencia',
      usuario_email: user.email ?? null,
      notas: `Entrada por transferencia desde ${target.label}`,
    })
  }

  // 3. Arrastrar documentos del aliado al carro local (archivos.subido_por es NOT NULL).
  let documentosCopiados = 0
  try {
    const { data: docs } = await src.from('archivos').select('tipo, url, nombre').eq('showroom_vehiculo_id', externoId)
    if (docs && docs.length && localId) {
      const { data: yaHay } = await admin.from('archivos').select('url').eq('showroom_vehiculo_id', localId)
      const urlsExistentes = new Set((yaHay ?? []).map((a: any) => a.url))
      const subidoPor = user.id
      const nuevos = docs
        .filter((d: any) => d.url && !urlsExistentes.has(d.url))
        .map((d: any) => ({ tipo: d.tipo, url: d.url, nombre: d.nombre ?? null, showroom_vehiculo_id: localId, subido_por: subidoPor }))
      if (nuevos.length) {
        const { error: docErr } = await admin.from('archivos').insert(nuevos)
        if (docErr) console.error('[transferir-entrada] fallo copiando documentos:', docErr.message)
        else documentosCopiados = nuevos.length
      }
    }
  } catch (e) {
    console.error('[transferir-entrada] error copiando documentos:', e)
  }

  // 4. Marcar la unidad como salida en el aliado (transferida a Jetplus).
  try {
    await src.from('vehiculos_showroom').update({
      estado: 'vendido',
      transferido_a: 'Jetplus',
      transferido_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', externoId)
    await src.from('showroom_historial').insert({
      showroom_vehiculo_id: externoId,
      estado_anterior: ext.estado,
      estado_nuevo: 'vendido',
      usuario_email: user.email ?? null,
      notas: 'Salida por transferencia a Jetplus',
    })
  } catch (e) {
    console.error('[transferir-entrada] error marcando salida en el aliado:', e)
  }

  const { data: local } = await admin.from('vehiculos_showroom').select('*').eq('id', localId).single()
  return NextResponse.json({ ok: true, showroomLocalId: localId, vehiculo: local, documentosCopiados })
}
