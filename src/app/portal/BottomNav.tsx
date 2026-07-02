'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Car, CreditCard, User } from 'lucide-react'

const items = [
  { href: '/portal/inicio', label: 'Inicio', icon: Home },
  { href: '/portal/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/portal/credito', label: 'Crédito', icon: CreditCard },
  { href: '/portal/perfil', label: 'Perfil', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe">
      <div className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-3 transition-colors ${
                active ? 'text-oriental-red' : 'text-gray-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
