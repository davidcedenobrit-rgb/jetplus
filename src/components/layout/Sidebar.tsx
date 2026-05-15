'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Car, TrendingUp, TrendingDown,
  CreditCard, BarChart2, LogOut, ArrowLeftRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/egresos', label: 'Egresos', icon: TrendingDown },
  { href: '/creditos', label: 'Créditos', icon: CreditCard },
  { href: '/tasas', label: 'Tasas', icon: ArrowLeftRight },
  { href: '/reportes', label: 'Reportes', icon: BarChart2 },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-oriental-black flex flex-col h-full flex-shrink-0 border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-oriental-red rounded-lg flex items-center justify-center">
            <Car size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">LA ORIENTAL</p>
            <p className="text-oriental-gray text-[11px] tracking-widest uppercase">Finanzas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-oriental-red text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs truncate mb-3">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-oriental-red text-sm transition-colors w-full"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
