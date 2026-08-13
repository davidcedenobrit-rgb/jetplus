export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { permitido } from '@/lib/rate-limit'

// Panel propio de cada vendedora: se autoriza SOLO por su código (mismo
// modelo sin sesión que el link público /ventas). Todo lo que devuelve está
// filtrado en el servidor por ese código — nunca debe salir cartera ajena.
const CODIGO_CASA = 'R000'

type VendedoraRef = { codigo: string; nombre: string }

// Clave de identidad para deduplicar/cruzar personas entre leads_captacion,
// cotizaciones y clientes que no comparten un id común: cédula si hay, si no
// los últimos 7 dígitos del teléfono, si no el nombre en minúsculas.
function claveIdentidad(input: { cedula?: string | null; telefono?: string | null; nombre?: string | null }): string {
  const ced = (input.cedula ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (ced) return `ced:${ced}`
  const tel = (input.telefono ?? '').replace(/\D/g, '')
  if (tel.length >= 7) return `tel:${tel.slice(-7)}`
  return `nom:${(input.nombre ?? '').trim().toLowerCase()}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const codigoTrim = String(body?.codigo ?? '').trim().toUpperCase()
    if (!/^[A-Za-z]\d{3}$/.test(codigoTrim)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    if (!(await permitido(`vendedoras-panel:${codigoTrim}`, 60, 60))) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 })
    }

    const supabase = await createAdminClient()

    const { data: vendedora } = await supabase
      .from('vendedoras')
      .select('codigo, nombre, activa')
      .eq('codigo', codigoTrim)
      .maybeSingle()

    if (!vendedora || (!vendedora.activa && codigoTrim !== CODIGO_CASA)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }
    const nombreLower = vendedora.nombre.trim().toLowerCase()

    // ── Cotizaciones atribuidas a esta vendedora ────────────────────────
    // OJO: .contains() sobre una columna jsonb de array-de-objetos falla
    // ("invalid input syntax for type json") si se le pasa un arreglo JS tal
    // cual (Supabase lo serializa como literal de arreglo de Postgres, no
    // como JSON) — hay que pasarlo como STRING JSON para que el operador
    // `cs.` de PostgREST reciba `vendedoras=cs.[{"codigo":"..."}]`.
    const { data: cotAtribuidasRaw, error: errAtribuidas } = await supabase
      .from('cotizaciones').select('*')
      .contains('vendedoras', JSON.stringify([{ codigo: codigoTrim }]))
    if (errAtribuidas) console.error('[vendedoras/panel] error cotizaciones atribuidas:', errAtribuidas)
    const cotAtribuidas = cotAtribuidasRaw ?? []

    // ── Mis clientes (COMPRADORES): solo quienes ya compraron un vehículo
    //    a través de ella. Atribución principal por NOMBRE en
    //    ventas_division_contable (directo o dentro de vendedores_split);
    //    respaldo por clientes.vendedor_codigo cuando además tienen vehículo
    //    propio (si no tiene vehículo, es un lead, no un cliente).
    const { data: ventasDiv } = await supabase
      .from('ventas_division_contable')
      .select('cliente_id, vendedora, vendedores_split')
      .not('cliente_id', 'is', null)
    const ventasPropias = (ventasDiv ?? []).filter(v => {
      if ((v.vendedora ?? '').trim().toLowerCase() === nombreLower) return true
      const split = Array.isArray(v.vendedores_split) ? v.vendedores_split : []
      return split.some((s: { nombre?: string }) => (s?.nombre ?? '').trim().toLowerCase() === nombreLower)
    })
    const idsPorDivisionContable = [...new Set(ventasPropias.map(v => v.cliente_id as string))]

    const { data: clientesPorCodigo } = await supabase.from('clientes').select('id').eq('vendedor_codigo', codigoTrim)
    const idsPorCodigo = (clientesPorCodigo ?? []).map(c => c.id)
    let idsConVehiculo: string[] = []
    if (idsPorCodigo.length) {
      const { data: conVehiculo } = await supabase.from('vehiculos').select('cliente_id').in('cliente_id', idsPorCodigo)
      idsConVehiculo = [...new Set((conVehiculo ?? []).map(v => v.cliente_id as string).filter(Boolean))]
    }

    const clienteIdsCompradores = [...new Set([...idsPorDivisionContable, ...idsConVehiculo])]

    const { data: compradoresRaw } = clienteIdsCompradores.length
      ? await supabase.from('clientes').select('id, nombre, cedula_rif, tipo, telefono, whatsapp, correo, direccion, ciudad, activo, created_at').in('id', clienteIdsCompradores)
      : { data: [] as { id: string; nombre: string; cedula_rif: string; tipo: string; telefono: string | null; whatsapp: string | null; correo: string | null; direccion: string | null; ciudad: string | null; activo: boolean; created_at: string }[] }

    const { data: vehiculosCompradores } = clienteIdsCompradores.length
      ? await supabase.from('vehiculos').select('cliente_id, marca, modelo, fecha_entrega').in('cliente_id', clienteIdsCompradores)
      : { data: [] as { cliente_id: string | null; marca: string; modelo: string; fecha_entrega: string | null }[] }
    const vehiculosPorCliente = new Map<string, { marca: string; modelo: string; fechaEntrega: string | null }[]>()
    for (const v of (vehiculosCompradores ?? [])) {
      if (!v.cliente_id) continue
      if (!vehiculosPorCliente.has(v.cliente_id)) vehiculosPorCliente.set(v.cliente_id, [])
      vehiculosPorCliente.get(v.cliente_id)!.push({ marca: v.marca, modelo: v.modelo, fechaEntrega: v.fecha_entrega })
    }

    const clientes = (compradoresRaw ?? []).map(c => ({ ...c, vehiculos: vehiculosPorCliente.get(c.id) ?? [] }))
    const clavesCompradores = new Set(clientes.map(c => claveIdentidad({ cedula: c.cedula_rif, telefono: c.telefono ?? c.whatsapp, nombre: c.nombre })))

    // ── Cotizaciones para "Mis cotizaciones" / ficha: atribuidas + todo el
    //    histórico de mis clientes compradores (aunque alguna cotización
    //    puntual la haya hecho otra vendedora o la casa).
    const { data: cotDeMisClientes } = clienteIdsCompradores.length
      ? await supabase.from('cotizaciones').select('*').in('cliente_id', clienteIdsCompradores)
      : { data: [] as Record<string, unknown>[] }

    const cotMap = new Map<string, Record<string, unknown>>()
    for (const c of [...cotAtribuidas, ...(cotDeMisClientes ?? [])]) {
      if (c?.id) cotMap.set(c.id as string, c)
    }
    const cotizaciones = Array.from(cotMap.values())
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      .map(c => {
        const vs: VendedoraRef[] = Array.isArray(c.vendedoras) ? c.vendedoras as VendedoraRef[] : []
        const compartidaCon = vs.filter(v => v.codigo !== codigoTrim).map(v => v.nombre)
        // El token de respuesta del cliente no debe salir de este endpoint.
        const rest: Record<string, unknown> = { ...c }
        delete rest.token_respuesta
        return { ...rest, compartidaCon } as Record<string, unknown> & { compartidaCon: string[] }
      })

    // ── Proformas nacidas de esas cotizaciones (para medir conversión). ──
    const cotIds = cotizaciones.map(c => c.id as string)
    const { data: proformas } = cotIds.length
      ? await supabase.from('proformas').select('id, numero, cotizacion_id, fecha_emision, precio_vehiculo, monto_inicial, monto_financiado, saldo_pendiente, created_at').in('cotizacion_id', cotIds)
      : { data: [] as Record<string, unknown>[] }

    // ── LEADS: personas que NO han comprado. Se combinan leads_captacion
    //    (registradas desde el link, campo `vendedor` = nombre o código) con
    //    las personas de sus propias cotizaciones, deduplicadas por
    //    cédula → teléfono → nombre, y se excluye a quien ya compró.
    const [{ data: leadsPorNombre }, { data: leadsPorCodigo }] = await Promise.all([
      supabase.from('leads_captacion').select('*').ilike('vendedor', vendedora.nombre),
      supabase.from('leads_captacion').select('*').ilike('vendedor', codigoTrim),
    ])
    const leadsCaptacionMap = new Map<string, Record<string, unknown>>()
    for (const l of [...(leadsPorNombre ?? []), ...(leadsPorCodigo ?? [])]) {
      if (l?.id) leadsCaptacionMap.set(l.id as string, l)
    }

    interface EntradaLead { clave: string; nombre: string; telefono: string | null; correo: string | null; fuente: 'registrado' | 'cotizado'; fecha: string; contexto: string | null }
    const entradas: EntradaLead[] = []
    for (const l of leadsCaptacionMap.values()) {
      entradas.push({
        clave: claveIdentidad({ telefono: l.telefono as string | null, nombre: l.nombre as string | null }),
        nombre: (l.nombre as string) ?? '(sin nombre)',
        telefono: l.telefono as string | null,
        correo: l.correo as string | null,
        fuente: 'registrado',
        fecha: l.created_at as string,
        contexto: [l.marca, l.modelo].filter(Boolean).join(' ') || null,
      })
    }
    for (const c of cotAtribuidas) {
      entradas.push({
        clave: claveIdentidad({ cedula: c.cliente_ci_rif, telefono: c.cliente_telefono, nombre: c.cliente_nombre }),
        nombre: c.cliente_nombre ?? '(sin nombre)',
        telefono: c.cliente_telefono,
        correo: c.cliente_correo,
        fuente: 'cotizado',
        fecha: c.created_at,
        contexto: [c.marca, c.modelo].filter(Boolean).join(' ') || null,
      })
    }

    interface GrupoLead { clave: string; nombre: string; telefono: string | null; correo: string | null; fuentes: Set<string>; cotizaciones: number; fecha: string; contexto: string | null }
    const grupos = new Map<string, GrupoLead>()
    for (const e of entradas) {
      if (!grupos.has(e.clave)) {
        grupos.set(e.clave, { clave: e.clave, nombre: e.nombre, telefono: e.telefono, correo: e.correo, fuentes: new Set(), cotizaciones: 0, fecha: e.fecha, contexto: e.contexto })
      }
      const g = grupos.get(e.clave)!
      g.fuentes.add(e.fuente)
      if (e.fuente === 'cotizado') g.cotizaciones++
      if (!g.telefono && e.telefono) g.telefono = e.telefono
      if (!g.correo && e.correo) g.correo = e.correo
      if (e.fecha > g.fecha) { g.fecha = e.fecha; g.contexto = e.contexto ?? g.contexto }
    }

    const leads = Array.from(grupos.values())
      .filter(g => !clavesCompradores.has(g.clave))
      .map(g => ({
        nombre: g.nombre, telefono: g.telefono, correo: g.correo,
        fuente: (g.fuentes.has('registrado') && g.fuentes.has('cotizado')) ? 'registrado_cotizado' : g.fuentes.has('registrado') ? 'registrado' : 'cotizado',
        cotizaciones: g.cotizaciones,
        contexto: g.contexto,
        fecha: g.fecha,
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))

    return NextResponse.json({
      vendedora: { codigo: vendedora.codigo, nombre: vendedora.nombre },
      leads,
      clientes,
      cotizaciones,
      proformas: proformas ?? [],
    })
  } catch (err) {
    console.error('[vendedoras/panel] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
