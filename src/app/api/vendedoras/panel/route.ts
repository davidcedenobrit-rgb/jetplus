export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { permitido } from '@/lib/rate-limit'

// Panel propio de cada vendedora: se autoriza SOLO por su código (mismo
// modelo sin sesión que el link público /ventas). El ROL lo decide el código
// con el que se entra (vendedoras.rol), no un interruptor en pantalla:
//   - "vendedor": ve solo lo suyo (todo lo de abajo queda filtrado en el
//     servidor por ese código — nunca debe salir cartera ajena).
//   - "socio": ve leads, clientes, cotizaciones y rapiditos de TODA la sede,
//     cada fila con el nombre de quién la trabajó, más una pestaña "Equipo"
//     con la conversión de cada vendedor(a).
const CODIGO_CASA = 'R000'

type VendedoraRef = { codigo: string; nombre: string }
type VendedoraSede = { codigo: string; nombre: string; rol: string; activa: boolean }

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

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// El campo `vendedor` de un lead a veces guarda el código, a veces el nombre
// que la vendedora escribió a mano. Se resuelve en este orden: código exacto,
// nombre exacto (sin acentos/mayúsculas), y como último recurso el primer
// nombre — pero SOLO si apunta a una única persona de la sede. Si hay dos
// "Carlos", adivinar es peor que dejarlo sin dueño.
function resolverVendedor(texto: string | null | undefined, sede: VendedoraSede[]): VendedoraRef | null {
  const t = (texto ?? '').trim()
  if (!t) return null
  const tUpper = t.toUpperCase()
  const porCodigo = sede.find(v => v.codigo.toUpperCase() === tUpper)
  if (porCodigo) return { codigo: porCodigo.codigo, nombre: porCodigo.nombre }
  const tNorm = normalizar(t)
  const porNombre = sede.find(v => normalizar(v.nombre) === tNorm)
  if (porNombre) return { codigo: porNombre.codigo, nombre: porNombre.nombre }
  const primerNombreTexto = tNorm.split(/\s+/)[0]
  const candidatos = sede.filter(v => normalizar(v.nombre).split(/\s+/)[0] === primerNombreTexto)
  if (candidatos.length === 1) return { codigo: candidatos[0].codigo, nombre: candidatos[0].nombre }
  return null
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
      .select('codigo, nombre, activa, rol')
      .eq('codigo', codigoTrim)
      .maybeSingle()

    if (!vendedora || (!vendedora.activa && codigoTrim !== CODIGO_CASA)) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
    }
    const esSocio = vendedora.rol === 'socio'
    const nombreLower = vendedora.nombre.trim().toLowerCase()

    if (esSocio) {
      return await panelSocio(supabase, vendedora)
    }

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

    // ── Mis rapiditos (registrados al generar el PDF rápido). ──
    const { data: rapiditos } = await supabase
      .from('cotizaciones_rapidas')
      .select('id, vendedora_codigo, vendedora_nombre, marca, modelo, precio_base, cuota_mensual, created_at')
      .eq('vendedora_codigo', codigoTrim)
      .order('created_at', { ascending: false })
      .limit(200)

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
      vendedora: { codigo: vendedora.codigo, nombre: vendedora.nombre, rol: 'vendedor' },
      leads,
      clientes,
      cotizaciones,
      proformas: proformas ?? [],
      rapiditos: rapiditos ?? [],
    })
  } catch (err) {
    console.error('[vendedoras/panel] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Vista de socio: TODA la sede, no una cartera individual. Cada fila trae el
// nombre de quién la trabajó, y se agrega una pestaña "Equipo" con la
// conversión de cada vendedor(a).
async function panelSocio(supabase: any, vendedora: { codigo: string; nombre: string }) {
  const { data: sedeRaw } = await supabase.from('vendedoras').select('codigo, nombre, rol, activa').order('nombre')
  const sede: VendedoraSede[] = (sedeRaw ?? []).map((v: any) => ({ codigo: v.codigo, nombre: v.nombre, rol: v.rol, activa: v.activa }))

  const [
    { data: leadsRaw },
    { data: cotizacionesRaw },
    { data: rapiditosRaw },
    { data: ventasDiv },
  ] = await Promise.all([
    supabase.from('leads_captacion').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('cotizaciones').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('cotizaciones_rapidas').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('ventas_division_contable').select('cliente_id, vendedora, vendedores_split').not('cliente_id', 'is', null),
  ])

  // ── Leads: cada uno con el vendedor resuelto (código exacto → nombre
  //    exacto → primer nombre si es único). Sin dueño si es ambiguo.
  const leads = (leadsRaw ?? []).map((l: any) => ({
    ...l,
    vendedorResuelto: resolverVendedor(l.vendedor, sede),
  }))

  // ── Cotizaciones: ya traen `vendedoras` estructurado (código+nombre) — una
  //    cotización compartida entre varios cuenta y aparece para cada quien la
  //    trabajó, igual que se reparte la comisión. Se limpia el token privado.
  const cotizaciones = (cotizacionesRaw ?? []).map((c: any) => {
    const rest = { ...c }
    delete rest.token_respuesta
    const vs: VendedoraRef[] = Array.isArray(c.vendedoras) ? c.vendedoras : []
    return { ...rest, trabajadaPor: vs.map(v => v.nombre) }
  })

  // ── Clientes compradores de TODA la sede, con quién los vendió. ──
  const ventas = ventasDiv ?? []
  const clienteIds = [...new Set(ventas.map((v: any) => v.cliente_id as string))]
  const { data: clientesRaw } = clienteIds.length
    ? await supabase.from('clientes').select('id, nombre, cedula_rif, tipo, telefono, whatsapp, correo, direccion, ciudad, activo, created_at').in('id', clienteIds)
    : { data: [] as any[] }
  const { data: vehiculosRaw } = clienteIds.length
    ? await supabase.from('vehiculos').select('cliente_id, marca, modelo, fecha_entrega').in('cliente_id', clienteIds)
    : { data: [] as any[] }
  const vehiculosPorCliente = new Map<string, { marca: string; modelo: string; fechaEntrega: string | null }[]>()
  for (const v of (vehiculosRaw ?? [])) {
    if (!v.cliente_id) continue
    if (!vehiculosPorCliente.has(v.cliente_id)) vehiculosPorCliente.set(v.cliente_id, [])
    vehiculosPorCliente.get(v.cliente_id)!.push({ marca: v.marca, modelo: v.modelo, fechaEntrega: v.fecha_entrega })
  }
  const vendedoresPorCliente = new Map<string, string[]>()
  for (const v of ventas) {
    const nombres = new Set<string>()
    if (v.vendedora) nombres.add(v.vendedora)
    const split = Array.isArray(v.vendedores_split) ? v.vendedores_split : []
    for (const s of split) if (s?.nombre) nombres.add(s.nombre)
    vendedoresPorCliente.set(v.cliente_id, [...nombres])
  }
  const clientes = (clientesRaw ?? []).map((c: any) => ({
    ...c,
    vehiculos: vehiculosPorCliente.get(c.id) ?? [],
    trabajadoPor: vendedoresPorCliente.get(c.id) ?? [],
  }))

  // ── Rapiditos de toda la sede. ──
  const rapiditos = rapiditosRaw ?? []

  // ── Proformas de toda la sede (para medir conversión por vendedor). ──
  const cotIds = cotizaciones.map((c: any) => c.id as string)
  const { data: proformasRaw } = cotIds.length
    ? await supabase.from('proformas').select('id, numero, cotizacion_id, fecha_emision, created_at').in('cotizacion_id', cotIds)
    : { data: [] as any[] }
  const proformas = proformasRaw ?? []
  const proformaPorCotId = new Set(proformas.map((p: any) => p.cotizacion_id))

  // ── Pestaña "Equipo": leads / rapiditos / cotizaciones / enviadas /
  //    proformas / % de conversión, por cada vendedor(a) activa de la sede.
  const equipo = sede.filter(v => v.activa !== false).map(v => {
    const misLeads = leads.filter((l: any) => l.vendedorResuelto?.codigo === v.codigo)
    const misRapiditos = rapiditos.filter((r: any) => r.vendedora_codigo === v.codigo)
    const misCotizaciones = cotizaciones.filter((c: any) => (Array.isArray(c.vendedoras) ? c.vendedoras : []).some((x: VendedoraRef) => x.codigo === v.codigo))
    const enviadas = misCotizaciones.filter((c: any) => !!c.resend_email_id).length
    const conProforma = misCotizaciones.filter((c: any) => proformaPorCotId.has(c.id)).length
    const conversionPct = misCotizaciones.length > 0 ? Math.round((conProforma / misCotizaciones.length) * 1000) / 10 : 0
    return {
      codigo: v.codigo, nombre: v.nombre, rol: v.rol,
      leads: misLeads.length, rapiditos: misRapiditos.length,
      cotizaciones: misCotizaciones.length, enviadas, proformas: conProforma,
      conversionPct,
    }
  })

  return NextResponse.json({
    vendedora: { codigo: vendedora.codigo, nombre: vendedora.nombre, rol: 'socio' },
    sede: sede.map(v => ({ codigo: v.codigo, nombre: v.nombre })),
    leads,
    clientes,
    cotizaciones,
    proformas,
    rapiditos,
    equipo,
  })
}
