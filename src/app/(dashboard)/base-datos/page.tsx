import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Car, Store, Boxes, Gift, Building2, Package, CalendarDays, Database, BarChart3 } from 'lucide-react'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

const CARDS: { href: string; label: string; desc: string; icon: any; color: string }[] = [
  { href: '/clientes', label: 'Clientes', desc: 'Cartera de clientes y su historial', icon: Users, color: 'text-blue-600 bg-blue-50' },
  { href: '/vehiculos', label: 'Vehículos', desc: 'Unidades vendidas y en cartera', icon: Car, color: 'text-red-600 bg-red-50' },
  { href: '/showroom', label: 'Showroom', desc: 'Inventario físico de vehículos', icon: Store, color: 'text-indigo-600 bg-indigo-50' },
  { href: '/link-ventas?tab=catalogo', label: 'Catálogo de vehículos', desc: 'Modelos, precios y estructura de costos', icon: Car, color: 'text-amber-600 bg-amber-50' },
  { href: '/proveedores', label: 'Proveedores', desc: 'Base de datos de proveedores', icon: Package, color: 'text-emerald-600 bg-emerald-50' },
  { href: '/materiales', label: 'Materiales e insumos', desc: 'Materiales e insumos de Jetplus', icon: Boxes, color: 'text-orange-600 bg-orange-50' },
  { href: '/obsequios', label: 'Obsequios a clientes', desc: 'Registro de obsequios entregados', icon: Gift, color: 'text-pink-600 bg-pink-50' },
  { href: '/base-datos/concesionarios', label: 'Concesionarios', desc: 'Concesionarios, prefijos y logos', icon: Building2, color: 'text-slate-600 bg-slate-50' },
  { href: '/eventos', label: 'Eventos', desc: 'Cronograma y calendario de eventos', icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
  { href: '/consolidados', label: 'Consolidados', desc: 'Ventas, compras y eventos del período', icon: BarChart3, color: 'text-teal-600 bg-teal-50' },
]

export default async function BaseDatosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-oriental-red/10 flex items-center justify-center">
          <Database className="text-oriental-red" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Base de datos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Bases maestras del sistema en un solo lugar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(c => {
          const Icon = c.icon
          return (
            <Link key={c.href} href={c.href}
              className="border border-gray-200 rounded-2xl p-5 hover:border-oriental-red hover:shadow-sm transition-all group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                <Icon size={20} />
              </div>
              <p className="font-bold text-oriental-black text-sm group-hover:text-oriental-red transition-colors">{c.label}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
