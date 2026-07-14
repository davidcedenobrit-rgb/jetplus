'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Car, TrendingUp, TrendingDown,
  CreditCard, BarChart2, LogOut, ArrowLeftRight, FolderOpen, ShieldCheck, PackageCheck, Upload, Store, Package,
  Shield, ScrollText, Building2, Ban, Globe, Handshake, Zap, ClipboardList, Inbox, Briefcase, Scale, Repeat, Coins
} from 'lucide-react'

const navItemsTop = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]
const navItemsBottom1 = [
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/egresos', label: 'Egresos', icon: TrendingDown },
  { href: '/creditos', label: 'Créditos', icon: CreditCard },
]
const navItemsBottom2 = [
  { href: '/tasas', label: 'Tasas', icon: ArrowLeftRight },
  { href: '/reportes', label: 'Reportes', icon: BarChart2 },
  { href: '/documentos-empresa', label: 'Docs. Empresa', icon: FolderOpen },
]
const navItemsBottom = [...navItemsBottom1, ...navItemsBottom2]
const navItems = [...navItemsTop, ...navItemsBottom]

const ROL_CARLA_VISIBLE = ['jose', 'admin', 'director', 'carla']

interface SidebarProps {
  userEmail: string
  rol?: string
  aprobacionesPendientes?: number
  depositosPendientesCarla?: number
  anulacionesPendientes?: number
  pagosPortalPendientes?: number
  onClose?: () => void
}

export default function Sidebar({ userEmail, rol = 'editor', aprobacionesPendientes = 0, depositosPendientesCarla = 0, anulacionesPendientes = 0, pagosPortalPendientes = 0, onClose }: SidebarProps) {
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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* ── NAV EXCLUSIVA CARLA ───────────────────────────────── */}
        {rol === 'carla' && (() => {
          const carlaNav = [
            { href: '/dashboard', label: 'Dashboard',         icon: LayoutDashboard },
            { href: '/carla',     label: 'RR · Recibido de Rojas', icon: PackageCheck },
            { href: '/clientes',  label: 'Clientes',           icon: Users },
            { href: '/showroom',  label: 'Vehículo Showroom',  icon: Store },
            { href: '/vehiculos', label: 'Vehículos',          icon: Car },
            { href: '/ingresos',  label: 'Ingresos',           icon: TrendingUp },
            { href: '/egresos',   label: 'Egresos',            icon: TrendingDown },
            { href: '/creditos',   label: 'Créditos',           icon: CreditCard },
            { href: '/acuerdos',   label: 'Acuerdos de Pago',   icon: Handshake },
            { href: '/vehimotors', label: 'Vehimotors',         icon: Building2 },
            { href: '/reportes',  label: 'Reportes',           icon: BarChart2 },
          ]
          return carlaNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isRR = href === '/carla'
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {isRR && depositosPendientesCarla > 0 && (
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {depositosPendientesCarla > 99 ? '99+' : depositosPendientesCarla}
                  </span>
                )}
              </Link>
            )
          })
        })()}

        {/* ── NAV RESTO DE ROLES ────────────────────────────────── */}
        {rol !== 'carla' && <>

          {/* Dashboard — oculto para Arianna y Almacén */}
          {!['arianna', 'almacen'].includes(rol) && navItemsTop.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}

          {/* Vehículo Showroom */}
          {!['almacen'].includes(rol) && (() => {
            const active = pathname === '/showroom' || pathname.startsWith('/showroom/')
            return (
              <Link href="/showroom" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Store size={18} />
                <span className="flex-1">Vehículo Showroom</span>
              </Link>
            )
          })()}

          {/* Acuerdos de Pago — debajo de Showroom */}
          {!['arianna', 'almacen'].includes(rol) && (() => {
            const active = pathname === '/acuerdos' || pathname.startsWith('/acuerdos/')
            return (
              <Link href="/acuerdos" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Handshake size={18} />
                <span className="flex-1">Acuerdos de Pago</span>
              </Link>
            )
          })()}

          {/* Repuestos — visible para todos */}
          {(() => {
            const active = pathname === '/repuestos' || pathname.startsWith('/repuestos/')
            return (
              <Link href="/repuestos" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Package size={18} />
                <span className="flex-1">Repuestos</span>
              </Link>
            )
          })()}

          {/* Clientes → Ingresos */}
          {!['arianna', 'almacen'].includes(rol) && navItemsBottom1.slice(0, 3).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}

          {/* Pagos del portal — bandeja de verificación */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/pagos-portal' || pathname.startsWith('/pagos-portal/')
            return (
              <Link href="/pagos-portal" onClick={onClose}
                className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-xs transition-all ${active ? 'bg-blue-600/30 text-white font-semibold border-l-2 border-blue-400' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
                <Inbox size={13} />
                <span className="flex-1">Pagos del portal</span>
                {pagosPortalPendientes > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {pagosPortalPendientes > 99 ? '99+' : pagosPortalPendientes}
                  </span>
                )}
              </Link>
            )
          })()}

          {/* Vehimotors — debajo de Ingresos */}
          {!['arianna', 'almacen'].includes(rol) && ['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const activeReportados = pathname === '/vehimotors'
            const activeReportar = pathname === '/vehimotors/reportar' || pathname.startsWith('/vehimotors/reportar/')
            return (
              <>
                <Link href="/vehimotors" onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeReportados ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                  <Building2 size={18} />
                  <span className="flex-1">Vehimotors</span>
                </Link>
                <Link href="/vehimotors/reportar" onClick={onClose}
                  className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-xs transition-all ${activeReportar ? 'bg-indigo-600/30 text-white font-semibold border-l-2 border-indigo-400' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
                  <Zap size={13} />
                  <span className="flex-1">Reportar pagos</span>
                </Link>
              </>
            )
          })()}

          {/* Egresos — visible para todos excepto almacén */}
          {rol !== 'almacen' && (() => {
            const active = pathname === '/egresos' || pathname.startsWith('/egresos/')
            return (
              <Link href="/egresos" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <TrendingDown size={18} />
                Egresos
              </Link>
            )
          })()}

          {/* Balance — debajo de Egresos, solo dirección */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/balance' || pathname.startsWith('/balance/')
            return (
              <Link href="/balance" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Scale size={18} />
                <span className="flex-1">Balance</span>
              </Link>
            )
          })()}

          {/* Cuentas por pagar/cobrar — solo dirección */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/cuentas' || pathname.startsWith('/cuentas/')
            return (
              <Link href="/cuentas" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Coins size={18} />
                <span className="flex-1">Por pagar / cobrar</span>
              </Link>
            )
          })()}

          {/* Pago Fijo — debajo de Balance, solo dirección */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/pagos-fijos' || pathname.startsWith('/pagos-fijos/')
            return (
              <Link href="/pagos-fijos" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Repeat size={18} />
                <span className="flex-1">Pago Fijo</span>
              </Link>
            )
          })()}

          {/* Link de Ventas — debajo de Egresos */}
          {!['arianna', 'almacen'].includes(rol) && ['jose', 'admin', 'director'].includes(rol) && (() => {
            const active = pathname === '/link-ventas' || pathname.startsWith('/link-ventas/')
            return (
              <Link href="/link-ventas" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Globe size={18} />
                <span className="flex-1">Link de Ventas</span>
              </Link>
            )
          })()}

          {/* Créditos */}
          {!['arianna', 'almacen'].includes(rol) && navItemsBottom1.slice(4).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}

          {/* Tasas → Docs. Empresa */}
          {!['arianna', 'almacen'].includes(rol) && navItemsBottom2.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                {label}
              </Link>
            )
          })}

          {/* Historial del cliente */}
          {!['arianna', 'almacen'].includes(rol) && (() => {
            const active = pathname === '/historial' || pathname.startsWith('/historial/')
            return (
              <Link href="/historial" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <ClipboardList size={18} />
                Historial cliente
              </Link>
            )
          })()}

          {/* Corporativo La Oriental */}
          {['jose', 'admin', 'director', 'mary', 'leysdem', 'carla'].includes(rol) && (() => {
            const active = pathname === '/corporativo' || pathname.startsWith('/corporativo/')
            return (
              <Link href="/corporativo" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Briefcase size={18} />
                Corporativo La Oriental
              </Link>
            )
          })()}

          {/* Aprobaciones */}
          {!['arianna', 'almacen'].includes(rol) && (() => {
            const active = pathname === '/aprobaciones' || pathname.startsWith('/aprobaciones/')
            return (
              <Link href="/aprobaciones" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
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

          {/* Anulaciones */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/anulaciones' || pathname.startsWith('/anulaciones/')
            return (
              <Link href="/anulaciones" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Ban size={18} />
                <span className="flex-1">Anulaciones</span>
                {anulacionesPendientes > 0 && (
                  <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {anulacionesPendientes > 99 ? '99+' : anulacionesPendientes}
                  </span>
                )}
              </Link>
            )
          })()}

          {/* Importar */}
          {['jose', 'admin', 'director', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/importar' || pathname.startsWith('/importar/')
            return (
              <Link href="/importar" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Upload size={18} />
                Importar datos
              </Link>
            )
          })()}

          {/* Auditoría y Logs */}
          {['director', 'admin'].includes(rol) && (() => {
            const activeAud = pathname === '/auditoria' || pathname.startsWith('/auditoria/')
            const activeLogs = pathname === '/logs' || pathname.startsWith('/logs/')
            return (
              <>
                <Link href="/auditoria" onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeAud ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                  <Shield size={18} />
                  Auditoría
                </Link>
                <Link href="/logs" onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeLogs ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                  <ScrollText size={18} />
                  Logs del sistema
                </Link>
              </>
            )
          })()}

          {/* Efectivo / Depositos */}
          {['director', 'admin', 'jose', 'mary', 'leysdem'].includes(rol) && (() => {
            const active = pathname === '/carla' || pathname.startsWith('/carla/')
            return (
              <Link href="/carla" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <PackageCheck size={18} />
                <span className="flex-1">Efectivo / Depósitos</span>
                {depositosPendientesCarla > 0 && (
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {depositosPendientesCarla > 99 ? '99+' : depositosPendientesCarla}
                  </span>
                )}
              </Link>
            )
          })()}

        </>}
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
          {rol === 'almacen' && (
            <span className="text-[10px] bg-blue-600/20 text-blue-600 font-semibold px-1.5 py-0.5 rounded">ALMACÉN</span>
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
