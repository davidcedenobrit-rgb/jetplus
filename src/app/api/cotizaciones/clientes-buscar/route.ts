export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js'
import { listaConcesionariosExternos } from '@/lib/concesionarios-externos'

const ROLES = ['jose', 'admin', 'director']

type Cliente = {
  nombre: string; ci_rif: string; correo: string; telefono: string
  direccion: string; ciudad_estado: string; codigo_postal: string; fuente: string
}

// Recolecta clientes (cotizaciones previas + tabla de clientes) de UNA base.
// `fuente` etiqueta el origen (útil cuando la cartera es compartida entre sedes).
async function recolectarDe(db: SupabaseClient, like: string, fuente: string): Promise<Cliente[]> {
  const [{ data: cot }, { data: cli }] = await Promise.all([
    db.from('cotizaciones')
      .select('cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, created_at')
      .or(`cliente_nombre.ilike.${like},cliente_ci_rif.ilike.${like},cliente_correo.ilike.${like},cliente_telefono.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(40),
    db.from('clientes')
      .select('nombre, cedula_rif, correo, telefono, direccion, ciudad')
      .or(`nombre.ilike.${like},cedula_rif.ilike.${like},correo.ilike.${like},telefono.ilike.${like}`)
      .limit(20),
  ])
  const out: Cliente[] = []
  for (const c of cot ?? []) out.push({
    nombre: c.cliente_nombre ?? '', ci_rif: c.cliente_ci_rif ?? '', correo: c.cliente_correo ?? '',
    telefono: c.cliente_telefono ?? '', direccion: c.cliente_direccion ?? '',
    ciudad_estado: c.cliente_ciudad_estado ?? '', codigo_postal: c.cliente_codigo_postal ?? '', fuente,
  })
  for (const c of cli ?? []) out.push({
    nombre: c.nombre ?? '', ci_rif: c.cedula_rif ?? '', correo: c.correo ?? '',
    telefono: c.telefono ?? '', direccion: c.direccion ?? '',
    ciudad_estado: c.ciudad ?? '', codigo_postal: '', fuente,
  })
  return out
}

// Cada base externa se consulta con tope de tiempo para no colgar la búsqueda.
async function conTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const supabase = await createAdminClient()

  // Autorización: staff con sesión y rol permitido, o código de vendedor(a) válido.
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  const rol = (user?.app_metadata?.rol as string) ?? ''
  let permitido = !!user && ROLES.includes(rol)
  if (!permitido) {
    const codigo = String(url.searchParams.get('codigo') ?? '').trim()
    if (/^[A-Za-z]\d{3}$/.test(codigo)) {
      const { data: v } = await supabase.from('vendedoras').select('activa').eq('codigo', codigo).maybeSingle()
      if (v && (v.activa || codigo.toUpperCase() === 'R000')) permitido = true
    }
  }
  if (!permitido) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = (url.searchParams.get('q') ?? '').replace(/[,()%*]/g, ' ').trim()
  if (q.length < 2) return NextResponse.json([])
  const like = `%${q}%`

  // Cartera COMPARTIDA: se busca en la base local + las de los otros
  // concesionarios del grupo (p. ej. un cliente que cotizó en Puerto Ordaz y
  // luego cotiza en Maturín). Las externas son best-effort (si una falla o no
  // está configurada, se ignora sin romper la búsqueda).
  const externos = listaConcesionariosExternos()
  const tareas: Promise<Cliente[]>[] = [
    conTimeout(recolectarDe(supabase, like, 'local'), 3500, []).catch(() => []),
    ...externos.map(a => {
      const cli = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      return conTimeout(recolectarDe(cli, like, a.label), 3000, []).catch(() => [])
    }),
  ]
  const resultados = (await Promise.all(tareas)).flat()

  // Dedup por cédula/RIF (o correo). Se conserva la primera aparición: local va
  // primero y las cotizaciones antes que la tabla de clientes → datos más frescos.
  const map = new Map<string, Cliente>()
  for (const c of resultados) {
    const key = String(c.ci_rif || c.correo || '').toLowerCase().trim()
    if (!key || map.has(key)) continue
    map.set(key, c)
  }

  return NextResponse.json(Array.from(map.values()).slice(0, 15))
}
