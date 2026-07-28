import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditarEgresoForm from './EditarEgresoForm'

export const dynamic = 'force-dynamic'

const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']
const EDITABLE = ['registrado', 'pendiente_aprobacion', 'correccion_requerida']

export default async function EditarEgresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''

  const admin = await createAdminClient()
  const { data: egreso } = await admin.from('egresos').select('*').eq('id', id).maybeSingle()
  if (!egreso) notFound()

  // Permiso: dirección o quien lo registró; y solo estados editables.
  if (!DIR.includes(rol) && egreso.registrado_por !== user.id) redirect(`/egresos/${id}`)
  if (!EDITABLE.includes(egreso.estado)) redirect(`/egresos/${id}`)

  const [{ data: centros }, { data: categorias }, prov] = await Promise.all([
    admin.from('centros_costo').select('id, nombre').eq('activo', true).order('orden'),
    admin.from('categorias_egreso').select('clave, nombre').eq('activo', true).order('orden'),
    egreso.proveedor_id
      ? admin.from('proveedores').select('id, nombre, rif, correo, telefono, numero_cuenta, banco, direccion').eq('id', egreso.proveedor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <EditarEgresoForm
      egreso={egreso}
      proveedorInicial={((prov as { data: unknown } | null)?.data ?? null) as any}
      centros={(centros as { id: string; nombre: string }[]) ?? []}
      categorias={(categorias as { clave: string; nombre: string }[]) ?? []}
    />
  )
}
