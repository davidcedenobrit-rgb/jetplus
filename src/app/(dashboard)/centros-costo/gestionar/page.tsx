import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import GestionarCentrosClient, { type CentroRow } from './GestionarCentrosClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director']

export default async function GestionarCentrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await svc.from('centros_costo').select('id, nombre, activo, orden, es_comun, genera_ingreso').order('orden')
  const { data: rep } = await svc.from('reparto_gastos_comunes').select('centro_costo_id, porcentaje')
  const reparto = (rep ?? []).map(r => ({ centro_costo_id: r.centro_costo_id as string, porcentaje: Number(r.porcentaje) }))
  const { data: cfg } = await svc.from('reparto_config').select('bloqueado_hasta, clave_hash').eq('id', 1).single()
  const bloqueadoHasta = (cfg?.bloqueado_hasta as string | null) ?? null
  const bloqueado = !!(bloqueadoHasta && new Date(bloqueadoHasta) > new Date())
  const tieneClave = !!cfg?.clave_hash
  return <GestionarCentrosClient inicial={(data as CentroRow[]) ?? []} repartoInicial={reparto} bloqueadoHasta={bloqueadoHasta} bloqueado={bloqueado} tieneClave={tieneClave} />
}
