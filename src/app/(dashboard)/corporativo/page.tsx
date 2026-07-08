import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import NuevoEmpleadoButton from './NuevoEmpleadoButton'
import EnlaceBaseCard from './EnlaceBaseCard'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function horasRestantes(venceAt: string | null): number | null {
  if (!venceAt) return null
  const diff = new Date(venceAt).getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60))
}

export default async function CorporativoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const { data: empleados } = await supabase
    .from('empleados')
    .select('id, nombre, cargo, departamento, estado, invitado_at, vence_at, completado_at, activo')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  const lista = empleados ?? []
  const total = lista.length
  const completados = lista.filter(e => e.estado === 'completado').length
  const pendientes = lista.filter(e => e.estado === 'pendiente').length

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Corporativo La Oriental</h1>
            <p className="text-oriental-gray text-sm">Nómina de empleados y descripciones de cargo</p>
          </div>
        </div>
        <NuevoEmpleadoButton />
      </div>

      {/* Enlace base para el grupo de WhatsApp */}
      <EnlaceBaseCard />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-[11px] text-oriental-gray uppercase tracking-wider mb-1">Empleados</p>
          <p className="text-2xl font-extrabold text-oriental-black">{total}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-amber-600 uppercase tracking-wider mb-1">Pendientes</p>
          <p className="text-2xl font-extrabold text-amber-600">{pendientes}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] text-green-600 uppercase tracking-wider mb-1">Completados</p>
          <p className="text-2xl font-extrabold text-green-600">{completados}</p>
        </div>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-oriental-gray font-medium">Aún no hay empleados registrados</p>
          <p className="text-sm text-gray-400 mt-1">Agrega el primer empleado para enviarle su cuestionario de descripción de cargo.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {lista.map(e => {
              const horas = horasRestantes(e.vence_at)
              const vencido = e.estado === 'pendiente' && horas !== null && horas < 0
              return (
                <Link
                  key={e.id}
                  href={`/corporativo/${e.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${e.estado === 'completado' ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {e.estado === 'completado'
                      ? <CheckCircle2 size={16} className="text-green-700" />
                      : <Clock size={16} className="text-amber-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-oriental-black truncate">{e.nombre}</p>
                    <p className="text-xs text-oriental-gray truncate">
                      {e.cargo ?? 'Cargo sin definir'}{e.departamento ? ` · ${e.departamento}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {e.estado === 'completado' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">Completado</span>
                    ) : vencido ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase inline-flex items-center gap-1">
                        <AlertTriangle size={10} /> Vencido
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">
                        {horas !== null ? `${horas}h restantes` : 'Pendiente'}
                      </span>
                    )}
                    <p className="text-[10px] text-oriental-gray mt-1">
                      {e.estado === 'completado' ? fmtFecha(e.completado_at) : `Invitado ${fmtFecha(e.invitado_at)}`}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
