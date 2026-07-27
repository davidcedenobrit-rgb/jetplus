import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ListChecks } from 'lucide-react'
import TareasClient from './TareasClient'

// Roles de dirección que pueden asignar/crear/eliminar tareas.
const ASIGNADORES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function TareasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  const puedeAsignar = ASIGNADORES.includes(rol)

  // Usuarios activos para el selector de responsable (solo lo usan los asignadores).
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><ListChecks size={22} className="text-oriental-red" /> Tareas</h1>
          <p className="text-oriental-gray text-sm mt-0.5">{puedeAsignar ? 'Asigna tareas al personal y sigue su avance' : 'Mi listado de tareas'}</p>
        </div>
      </div>
      <TareasClient
        currentUserId={user.id}
        puedeAsignar={puedeAsignar}
        usuarios={(usuarios as { id: string; nombre: string; rol: string }[]) ?? []}
      />
    </div>
  )
}
