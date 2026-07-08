import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Briefcase, ClipboardList, Award, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import ReenviarEnlaceButton from './ReenviarEnlaceButton'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

function fmt(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
function fmtDia(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function Campo({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-oriental-gray uppercase tracking-wide">{label}</p>
      <p className="text-sm text-oriental-black mt-0.5 whitespace-pre-wrap">{valor?.trim() ? valor : '—'}</p>
    </div>
  )
}

export default async function EmpleadoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const { id } = await params
  const { data: e } = await supabase.from('empleados').select('*').eq('id', id).single()
  if (!e) notFound()

  const completo = e.estado === 'completado'

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/corporativo" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-oriental-black">{e.nombre}</h1>
            {completo ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase inline-flex items-center gap-1">
                <CheckCircle2 size={11} /> Completado
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase inline-flex items-center gap-1">
                <Clock size={11} /> Pendiente
              </span>
            )}
          </div>
          <p className="text-oriental-gray text-sm mt-0.5">{e.cargo ?? 'Cargo sin definir'}{e.departamento ? ` · ${e.departamento}` : ''}</p>
        </div>
      </div>

      {/* Estado del cuestionario */}
      {!completo && (
        <div className="card p-5 mb-5 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Cuestionario pendiente</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Invitado el {fmt(e.invitado_at)} · Fecha límite {fmt(e.vence_at)} (72 horas)
              </p>
              <div className="mt-3">
                <ReenviarEnlaceButton token={e.token} nombre={e.nombre} />
              </div>
            </div>
          </div>
        </div>
      )}

      {completo && (
        <div className="card p-4 mb-5 bg-green-50 border border-green-200">
          <p className="text-xs text-green-800">
            Descripción de cargo completada el <span className="font-bold">{fmt(e.completado_at)}</span>.
          </p>
        </div>
      )}

      {/* Datos personales */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <User size={15} className="text-oriental-red" /> Datos personales
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nombre" valor={e.nombre} />
          <Campo label="Cédula" valor={e.cedula} />
          <Campo label="Teléfono" valor={e.telefono} />
          <Campo label="Correo" valor={e.correo} />
          <Campo label="Fecha de ingreso" valor={fmtDia(e.fecha_ingreso)} />
        </div>
      </div>

      {/* Cargo y área */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Briefcase size={15} className="text-oriental-red" /> Cargo y área
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Cargo" valor={e.cargo} />
          <Campo label="Departamento / Área" valor={e.departamento} />
          <Campo label="Reporta a" valor={e.reporta_a} />
        </div>
      </div>

      {/* Responsabilidades */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList size={15} className="text-oriental-red" /> Responsabilidades y funciones
        </h2>
        <div className="space-y-4">
          <Campo label="Responsabilidades principales" valor={e.responsabilidades} />
          <Campo label="Funciones" valor={e.funciones} />
          <Campo label="Tareas del día a día" valor={e.tareas_diarias} />
        </div>
      </div>

      {/* Competencias */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award size={15} className="text-oriental-red" /> Competencias y observaciones
        </h2>
        <div className="space-y-4">
          <Campo label="Habilidades / competencias" valor={e.competencias} />
          <Campo label="Herramientas / sistemas" valor={e.herramientas} />
          <Campo label="Observaciones" valor={e.observaciones} />
        </div>
      </div>
    </div>
  )
}
