'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Car, TrendingUp, TrendingDown,
  CreditCard, BarChart2, LogOut, ArrowLeftRight, FolderOpen, ShieldCheck, PackageCheck, Upload, Store, Package,
  Shield, ScrollText, Building2, Ban, Globe, Handshake, Zap, ClipboardList, Inbox, Briefcase, Scale, Repeat, Coins, ShoppingBag, Boxes, Gift, CalendarDays, Truck, ChevronDown, Wallet, ExternalLink, BookOpenCheck, BookOpen, FileBarChart2, Link2, Database, ListChecks, Warehouse
} from 'lucide-react'
import { BRANDING } from '@/lib/branding'
import { MOSTRAR_TODO_EL_MENU, SECCIONES_VISIBLES, LINKS_VENTAS_VISIBLES, MOSTRAR_DASHBOARD_Y_TAREAS } from '@/lib/menu-config'

// ── Roles auxiliares ────────────────────────────────────────────────
const DIR = ['jose', 'admin', 'director', 'mary', 'leysdem']
const DIR_CORE = ['director', 'admin']

type BadgeKey = 'aprob' | 'anul' | 'dep' | 'portal'

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
  roles?: string[]      // lista blanca: solo estos roles lo ven
  hideFor?: string[]    // lista negra: todos menos estos
  badge?: BadgeKey
  sub?: NavLink[]
  exact?: boolean       // activo solo con coincidencia exacta de ruta
  external?: boolean    // enlace a otro dominio (abre en pestaña nueva)
  emails?: string[]     // lista blanca por correo (además del rol)
}

// Super-admin que navega entre concesionarios (Rojas). Configurable por env.
const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ?? 'admin@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

interface NavSection {
  id: string
  title: string
  icon: LucideIcon
  links: NavLink[]
}

// ── Estructura del menú (roles distintos de carla / taller) ─────────
const SECTIONS: NavSection[] = [
  {
    id: 'ventas',
    title: 'Ventas y Clientes',
    icon: Users,
    links: [
      { href: '/gestion-ventas', label: 'Ventas',        icon: ShoppingBag,   roles: DIR },
      { href: '/precompra',      label: 'Precompra AC500', icon: ShieldCheck, roles: DIR },
      { href: '/reportes/ventas', label: 'Reporte de ventas', icon: BarChart2, roles: DIR },
      { href: '/base-datos', label: 'Base de datos',      icon: Database,      roles: DIR },
      { href: '/clientes',  label: 'Clientes',          icon: Users,         hideFor: ['arianna', 'almacen'] },
      { href: '/vehiculos', label: 'Vehículos',         icon: Car,           hideFor: ['arianna', 'almacen'] },
      { href: '/showroom',  label: 'Vehículo Showroom', icon: Store,         hideFor: ['almacen'], sub: [
        { href: '/showroom/transferencias', label: 'Transferencias', icon: ArrowLeftRight, hideFor: ['almacen'] },
      ] },
      { href: '/link-ventas', label: 'Link de Ventas',  icon: Globe,         roles: ['jose', 'admin', 'director'] },
      { href: '/creditos',  label: 'Créditos',          icon: CreditCard,    hideFor: ['arianna', 'almacen'] },
      { href: '/reportes/creditos', label: 'Reporte de créditos', icon: BarChart2, roles: DIR },
      { href: '/acuerdos',  label: 'Acuerdos de Pago',  icon: Handshake,     hideFor: ['arianna', 'almacen'] },
      { href: '/historial', label: 'Historial cliente', icon: ClipboardList, hideFor: ['arianna', 'almacen'] },
    ],
  },
  {
    id: 'finanzas',
    title: 'Finanzas',
    icon: Coins,
    links: [
      { href: '/ingresos',     label: 'Ingresos',           icon: TrendingUp,   hideFor: ['arianna', 'almacen'] },
      { href: '/anticipos',    label: 'Anticipos',          icon: Wallet,       hideFor: ['arianna', 'almacen'] },
      { href: '/egresos',      label: 'Egresos',            icon: TrendingDown, hideFor: ['almacen'] },
      { href: '/pagos-portal', label: 'Pagos del portal',   icon: Inbox,        roles: DIR, badge: 'portal' },
      { href: '/ejecutivo',    label: 'Panel ejecutivo',    icon: LayoutDashboard, roles: DIR_CORE },
      { href: '/balance',      label: 'Balance',            icon: Scale,        roles: DIR },
      { href: '/estado-resultados', label: 'Estado de resultados', icon: FileBarChart2, roles: DIR },
      { href: '/flujo-caja',   label: 'Flujo de caja',      icon: Coins,        roles: DIR },
      { href: '/posicion-financiera', label: 'Posición financiera', icon: Scale, roles: DIR },
      { href: '/movimientos',  label: 'Movimientos y conciliación', icon: Wallet, roles: DIR },
      { href: '/libro-iva',    label: 'Libro de IVA',       icon: Scale,        roles: DIR },
      { href: '/cobranza',     label: 'Cartera de cobranza', icon: Coins,       roles: DIR },
      { href: '/reportes/cobros', label: 'Cobros por quincena', icon: CalendarDays, roles: DIR },
      { href: '/centros-costo', label: 'Centros de costo',  icon: BarChart2,    roles: DIR },
      { href: '/cuentas',      label: 'Por pagar / cobrar', icon: Coins,        roles: DIR },
      { href: '/pagos-fijos',  label: 'Pago Fijo',          icon: Repeat,       roles: DIR },
      { href: '/tasas',        label: 'Tasas',              icon: ArrowLeftRight, hideFor: ['arianna', 'almacen'] },
      { href: '/reportes',     label: 'Reportes',           icon: BarChart2,    hideFor: ['arianna', 'almacen'] },
      { href: '/consolidados', label: 'Consolidados',       icon: BarChart2,    roles: DIR },
      { href: '/proveedores',  label: 'Proveedores',        icon: Truck,        roles: DIR },
      { href: '/aprobaciones', label: 'Aprobaciones',       icon: ShieldCheck,  hideFor: ['arianna', 'almacen'], badge: 'aprob' },
      { href: '/anulaciones',  label: 'Anulaciones',        icon: Ban,          roles: DIR, badge: 'anul' },
      { href: '/carla',        label: 'Efectivo / Depósitos', icon: PackageCheck, roles: ['director', 'admin', 'jose', 'mary', 'leysdem'], badge: 'dep' },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario y Repuestos',
    icon: Boxes,
    links: [
      { href: '/repuestos',  label: 'Solicitudes a VM',   icon: Package, sub: [
        { href: '/repuestos/almacen', label: 'Almacén Jetplus', icon: Warehouse },
        { href: '/repuestos/compra-plaza', label: 'Compra en plaza', icon: ShoppingBag },
        { href: '/repuestos/catalogo-plaza', label: 'Catálogo compra en plaza', icon: BookOpen },
        { href: '/repuestos/catalogo', label: 'Catálogo repuestos VM', icon: BookOpenCheck },
      ] },
      { href: '/materiales', label: 'Materiales e insumos', icon: Boxes,     roles: DIR },
    ],
  },
  {
    id: 'vehimotors',
    title: 'Vehimotors',
    icon: Building2,
    links: [
      { href: '/vehimotors',              label: 'Reportes de pagos', icon: Building2, roles: DIR, exact: true },
      { href: '/vehimotors/asignaciones', label: 'Asignaciones y Ventas', icon: Link2, roles: DIR },
      { href: '/vehimotors/reportar',     label: 'Reportar pagos',    icon: Zap,       roles: DIR },
      { href: '/vehimotors/conciliacion', label: 'Conciliación',      icon: Wallet,    roles: DIR },
      { href: '/vehimotors/custodia',     label: 'Fondos en custodia', icon: Coins,    roles: DIR },
    ],
  },
  {
    id: 'corporativo',
    title: 'Corporativo',
    icon: Briefcase,
    links: [
      { href: '/corporativo',        label: `Corporativo ${BRANDING.marca}`, icon: Briefcase,  roles: DIR },
      { href: '/corporativo/seguridad', label: 'Seguridad',            icon: Shield,     emails: SUPER_ADMIN_EMAILS },
      { href: '/corporativo/contabilidad-ac500', label: 'Contabilidad AC500', icon: BookOpenCheck, roles: DIR },
      { href: '/obsequios',          label: 'Obsequios a clientes',    icon: Gift,       roles: DIR },
      { href: '/eventos',            label: 'Eventos',                 icon: CalendarDays, roles: DIR },
      { href: '/documentos-empresa', label: 'Docs. Empresa',           icon: FolderOpen, hideFor: ['arianna', 'almacen'] },
    ],
  },
  {
    id: 'admin',
    title: 'Sistema CDM',
    icon: Shield,
    links: [
      { href: '/capital-motors', label: 'Capital Motors', icon: Building2, emails: SUPER_ADMIN_EMAILS },
      { href: '/contabilidad', label: 'Contabilidad', icon: BookOpenCheck, emails: SUPER_ADMIN_EMAILS },
      { href: '/importar',  label: 'Importar datos',   icon: Upload,     roles: DIR },
      { href: '/auditoria', label: 'Auditoría',        icon: Shield,     roles: DIR_CORE },
      { href: '/logs',      label: 'Logs del sistema', icon: ScrollText, roles: DIR_CORE },
    ],
  },
]

const DASHBOARD_LINK: NavLink = { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hideFor: ['arianna', 'almacen'] }
// Tareas — visible para todos los roles (cada quien ve "Mis tareas").
const TAREAS_LINK: NavLink = { href: '/tareas', label: 'Tareas', icon: ListChecks }

function canSee(link: NavLink, rol: string, email?: string): boolean {
  const byEmail = link.emails ? link.emails.map(e => e.toLowerCase()).includes((email ?? '').toLowerCase()) : false
  const byRole = link.roles ? link.roles.includes(rol) : false
  // Si el link define ambos (roles + emails), basta con cumplir uno (OR).
  if (link.emails && link.roles) return byEmail || byRole
  if (link.emails) return byEmail
  if (link.roles) return byRole
  if (link.hideFor) return !link.hideFor.includes(rol)
  return true
}

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
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))

  const badgeCounts: Record<BadgeKey, number> = {
    aprob: aprobacionesPendientes,
    anul: anulacionesPendientes,
    dep: depositosPendientesCarla,
    portal: pagosPortalPendientes,
  }
  const badgeColor: Record<BadgeKey, string> = {
    aprob: 'bg-oriental-red',
    anul: 'bg-orange-600',
    dep: 'bg-teal-600',
    portal: 'bg-blue-500',
  }

  const matchPath = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isActive = (link: NavLink) => {
    if (link.exact) return pathname === link.href
    const self = matchPath(link.href)
    if (link.sub) return self && !link.sub.some(s => matchPath(s.href))
    return self
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkBadge = (link: NavLink) => (link.badge ? badgeCounts[link.badge] : 0)

  function renderLink(link: NavLink, isSub = false) {
    const active = isActive(link)
    const count = linkBadge(link)
    const Icon = link.icon
    if (isSub) {
      return (
        <Link key={link.href} href={link.href} onClick={onClose}
          className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-xs transition-all ${active ? 'bg-oriental-red/20 text-white font-semibold border-l-2 border-oriental-red' : 'text-gray-500 hover:bg-gray-800/60 hover:text-white'}`}>
          <Icon size={13} />
          <span className="flex-1">{link.label}</span>
          {count > 0 && (
            <span className={`${badgeColor[link.badge!]} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none`}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Link>
      )
    }
    if (link.external) {
      return (
        <div key={link.href}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-gray-400 hover:bg-gray-800/60 hover:text-white">
            <Icon size={18} />
            <span className="flex-1">{link.label}</span>
            <ExternalLink size={13} className="text-gray-500" />
          </a>
        </div>
      )
    }
    return (
      <div key={link.href}>
        <Link href={link.href} onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
          <Icon size={18} />
          <span className="flex-1">{link.label}</span>
          {count > 0 && (
            <span className={`${badgeColor[link.badge!]} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none`}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Link>
      </div>
    )
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
            <p className="text-white font-bold text-sm leading-tight tracking-tight">{BRANDING.sidebarTitulo}</p>
            <p className="text-oriental-gray text-[11px] tracking-widest uppercase">{BRANDING.sidebarSub}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* ── NAV EXCLUSIVA DIRECTORA CH ───────────────────────────── */}
        {rol === 'carla' && (() => {
          const carlaNav = [
            { href: '/dashboard', label: 'Dashboard',         icon: LayoutDashboard },
            { href: '/tareas',    label: 'Tareas',             icon: ListChecks },
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

        {/* ── NAV EXCLUSIVA TALLER (Jose Manuel, Yoiber) ───────────── */}
        {rol === 'taller' && (() => {
          const tallerNav = [
            { href: '/dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
            { href: '/tareas',     label: 'Tareas',             icon: ListChecks },
            { href: '/showroom',   label: 'Vehículo Showroom',  icon: Store },
            { href: '/repuestos',  label: 'Solicitudes a VM',   icon: Package },
            { href: '/repuestos/almacen', label: 'Almacén Jetplus', icon: Warehouse },
            { href: '/repuestos/compra-plaza', label: 'Compra en plaza', icon: ShoppingBag },
          ]
          return tallerNav.map(({ href, label, icon: Icon }) => {
            const active = href === '/repuestos'
              ? (pathname === '/repuestos' || (pathname.startsWith('/repuestos/') && !pathname.startsWith('/repuestos/compra-plaza') && !pathname.startsWith('/repuestos/almacen')))
              : (pathname === href || pathname.startsWith(href + '/'))
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-oriental-red text-white font-semibold' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
              </Link>
            )
          })
        })()}

        {/* ── NAV RESTO DE ROLES (agrupada en secciones) ───────────── */}
        {rol !== 'carla' && rol !== 'taller' && <>

          {/* Dashboard — enlace suelto arriba */}
          {(MOSTRAR_TODO_EL_MENU || MOSTRAR_DASHBOARD_Y_TAREAS) && canSee(DASHBOARD_LINK, rol, userEmail) && renderLink(DASHBOARD_LINK)}
          {/* Tareas — visible para todos */}
          {(MOSTRAR_TODO_EL_MENU || MOSTRAR_DASHBOARD_Y_TAREAS) && renderLink(TAREAS_LINK)}

          {/* Secciones colapsables */}
          {SECTIONS.filter(s => MOSTRAR_TODO_EL_MENU || SECCIONES_VISIBLES.has(s.id)).map(section => {
            const links = section.links
              .filter(l => canSee(l, rol, userEmail))
              .filter(l => MOSTRAR_TODO_EL_MENU || section.id !== 'ventas' || LINKS_VENTAS_VISIBLES.has(l.href))
            if (links.length === 0) return null

            const isOpen = open[section.id] ?? false
            const sectionActive = links.some(l => isActive(l) || (l.sub?.some(s => matchPath(s.href)) ?? false))
            const pending = links.reduce((n, l) => n + linkBadge(l), 0)
            const SectionIcon = section.icon

            return (
              <div key={section.id} className="pt-0.5">
                <button onClick={() => toggle(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${sectionActive ? 'text-white bg-gray-800/40' : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}>
                  <SectionIcon size={18} />
                  <span className="flex-1 text-left">{section.title}</span>
                  {!isOpen && pending > 0 && (
                    <span className="bg-oriental-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                      {pending > 99 ? '99+' : pending}
                    </span>
                  )}
                  <ChevronDown size={15} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="mt-1 mb-1 space-y-0.5 rounded-lg bg-white/[0.07] border border-white/5 p-1.5">
                    {links.map(link => (
                      <div key={link.href}>
                        {renderLink(link)}
                        {link.sub?.filter(s => canSee(s, rol, userEmail)).map(s => renderLink(s, true))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

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
            <span className="text-[10px] bg-teal-600/20 text-teal-600 font-semibold px-1.5 py-0.5 rounded">DIRECTORA CH</span>
          )}
          {rol === 'arianna' && (
            <span className="text-[10px] bg-orange-600/20 text-orange-500 font-semibold px-1.5 py-0.5 rounded">SHOWROOM</span>
          )}
          {rol === 'almacen' && (
            <span className="text-[10px] bg-blue-600/20 text-blue-600 font-semibold px-1.5 py-0.5 rounded">ALMACÉN</span>
          )}
          {rol === 'taller' && (
            <span className="text-[10px] bg-amber-600/20 text-amber-600 font-semibold px-1.5 py-0.5 rounded">TALLER</span>
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
