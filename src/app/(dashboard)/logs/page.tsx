import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScrollText, CheckCircle2, Wrench, Shield, Zap, Package, CreditCard, Car, Layout } from 'lucide-react'

const SOLO_JOSE = ['director', 'admin']

type LogEntry = {
  id: string
  fecha: string
  categoria: string
  titulo: string
  descripcion: string
  beneficio: string
}

const categoriaConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  mejora:       { label: 'Mejora',       color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Zap },
  corrección:   { label: 'Corrección',   color: 'text-orange-700', bg: 'bg-orange-100', icon: Wrench },
  nuevo:        { label: 'Nuevo',        color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
  seguridad:    { label: 'Seguridad',    color: 'text-red-700',    bg: 'bg-red-100',    icon: Shield },
  repuestos:    { label: 'Repuestos',    color: 'text-purple-700', bg: 'bg-purple-100', icon: Package },
  ingresos:     { label: 'Ingresos',     color: 'text-teal-700',   bg: 'bg-teal-100',   icon: CreditCard },
  showroom:     { label: 'Showroom',     color: 'text-pink-700',   bg: 'bg-pink-100',   icon: Car },
  ui:           { label: 'Interfaz',     color: 'text-indigo-700', bg: 'bg-indigo-100', icon: Layout },
}

const fallbackCfg = { label: 'Sistema', color: 'text-gray-700', bg: 'bg-gray-100', icon: ScrollText }

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function LogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!SOLO_JOSE.includes(rol)) redirect('/dashboard')

  const { data: logs } = await supabase
    .from('system_changelog')
    .select('id, fecha, categoria, titulo, descripcion, beneficio')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  const entries: LogEntry[] = logs ?? []

  // Group by month
  const grouped: Record<string, LogEntry[]> = {}
  for (const e of entries) {
    const key = new Date(e.fecha).toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
          <ScrollText size={20} className="text-oriental-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Registro de Cambios</h1>
          <p className="text-oriental-gray text-sm">Historial de mejoras y actualizaciones del sistema</p>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="card p-12 text-center text-oriental-gray">No hay entradas registradas.</div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([mes, items]) => (
          <section key={mes}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-oriental-gray mb-3 px-1 capitalize">
              {mes}
            </h2>
            <div className="card divide-y divide-gray-100">
              {items.map(log => {
                const cfg = categoriaConfig[log.categoria] ?? fallbackCfg
                const Icon = cfg.icon
                return (
                  <div key={log.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon size={13} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <p className="text-sm font-semibold text-oriental-black">{log.titulo}</p>
                        </div>
                        {log.descripcion && (
                          <p className="text-xs text-oriental-gray mt-1.5 leading-relaxed">{log.descripcion}</p>
                        )}
                        {log.beneficio && (
                          <p className="text-xs text-green-700 mt-1.5 flex items-start gap-1">
                            <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" />
                            {log.beneficio}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5 flex-shrink-0">
                        {formatFecha(log.fecha)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
