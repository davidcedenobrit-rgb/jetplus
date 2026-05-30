'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Car, TrendingUp, TrendingDown,
  CreditCard, BarChart2, LogOut, ArrowLeftRight, FolderOpen, ShieldCheck, PackageCheck, Upload, Store
} from 'lucide-react'

const navItemsTop = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]
const navItemsBottom = [
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/egresos', label: 'Egresos', icon: TrendingDown },
  { href: '/creditos', label: 'Créditos', icon: CreditCard },
  { href: '/tasas', label: 'Tasas', icon: ArrowLeftRight },
  { href: '/reportes', label: 'Reportes', icon: BarChart2 },
  { href: '/documentos-empresa', label: 'Docs. Empresa', icon: FolderOpen },
]
const navItems = [...navItemsTop, ...navItemsBottom]

const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla']

interface SidebarProps {
  userEmail: string
  rol?: string
  aprobacionesPendientes?: number
  depositosPendientesCarla?: number
  onClose?: () => void
}

export default function Sidebar({ userEmail, rol = 'editor', aprobacionesPendientes = 0, depositosPendientesCarla = 0, onClose }: SidebarProps) {
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
            <p className="text-white font-bold text-sm leading-tight tracking-tight">CENTRO DE MANDO</p>
            <p className="text-oriental-gray text-[11px] tracking-widest uppercase">La Oriental Automotors</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {/* Resto del menú — oculto para Arianna */}
        {rol !== 'arianna' && navItemsTop.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
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

        {/* Vehículo Showroom — entre Dashboard y Clientes */}
        {(() => {
          const active = pathname === '/showroom' || pathname.startsWith('/showroom/')
          return (
            <Link href="/showroom" onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
              <Store size={18} />
              <span className="flex-1">Vehículo Showroom</span>
            </Link>
          )
        })()}

        {/* Clientes en adelante — oculto para Arianna */}
        {rol !== 'arianna' && navItemsBottom.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}

        {/* Aprobaciones — oculto para Arianna */}
        {rol !== 'arianna' && (() => {
          const active = pathname === '/aprobaciones' || pathname.startsWith('/aprobaciones/')
          return (
            <Link
              href="/aprobaciones"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-oriental-red text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              <ShieldCheck size={18} />
              <span className="flex-1">Aprobaciones</span>
              {aprobacionesPendientes > 0 && (
                <span className="bg-oriental-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {aprobacionesPendientes > 99 ? '99+' : aprobacionesPendientes}
                </span>
              )}
            </Link>
          )
        })()}

        {/* Importar — solo directores, no Arianna */}
        {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
          const active = pathname === '/importar' || pathname.startsWith('/importar/')
          return (
            <Link
              href="/importar"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-oriental-red text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              <Upload size={18} />
              Importar datos
            </Link>
          )
        })()}

        {/* Carla — visible solo para carla/jose/admin */}
        {ROL_CARLA_VISIBLE.includes(rol) && (() => {
          const active = pathname === '/carla' || pathname.startsWith('/carla/')
          return (
            <Link
              href="/carla"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-oriental-red text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              <PackageCheck size={18} />
              <span className="flex-1">Carla</span>
              {depositosPendientesCarla > 0 && (
                <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {depositosPendientesCarla > 99 ? '99+' : depositosPendientesCarla}
                </span>
              )}
            </Link>
          )
        })()}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-gray-500 text-xs truncate flex-1">{userEmail}</p>
          {(rol === 'director' || rol === 'jose') && (
            <span className="text-[10px] bg-oriental-red/20 text-oriental-red font-semibold px-1.5 py-0.5 rounded">DIR</span>
          )}
          {rol === 'carla' && (
            <span className="text-[10px] bg-teal-600/20 text-teal-600 font-semibold px-1.5 py-0.5 rounded">CARLA</span>
          )}
          {rol === 'arianna' && (
            <span className="text-[10px] bg-orange-600/20 text-orange-500 font-semibold px-1.5 py-0.5 rounded">SHOWROOM</span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-oriental-red text-sm transition-colors w-full mt-2"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
