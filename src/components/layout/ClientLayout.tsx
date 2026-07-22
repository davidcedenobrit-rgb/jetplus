'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { BRANDING } from '@/lib/branding'

interface ClientLayoutProps {
  children: React.ReactNode
  userEmail: string
  rol: string
  aprobacionesPendientes: number
  depositosPendientesCarla: number
  anulacionesPendientes: number
  pagosPortalPendientes?: number
}

export default function ClientLayout({
  children,
  userEmail,
  rol,
  aprobacionesPendientes,
  depositosPendientesCarla,
  anulacionesPendientes,
  pagosPortalPendientes = 0,
}: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // El contenido scrollea dentro de <main> (no la ventana), así que el navegador
  // no restaura la posición al dar "atrás". Guardamos y restauramos el scroll de
  // <main> por ruta para volver justo donde estabas.
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const posRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const saved = posRef.current.get(pathname) ?? 0
    const restore = () => main.scrollTo(0, saved)
    restore()
    const raf = requestAnimationFrame(restore) // reintento tras pintar el contenido
    const onScroll = () => { posRef.current.set(pathname, main.scrollTop) }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(raf); main.removeEventListener('scroll', onScroll) }
  }, [pathname])

  return (
    <div className="flex h-screen bg-oriental-bg overflow-hidden">

      {/* Overlay móvil — toca fuera para cerrar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer en móvil, fijo en desktop */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-30 h-full
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          userEmail={userEmail}
          rol={rol}
          aprobacionesPendientes={aprobacionesPendientes}
          depositosPendientesCarla={depositosPendientesCarla}
          anulacionesPendientes={anulacionesPendientes}
          pagosPortalPendientes={pagosPortalPendientes}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior móvil */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Menu size={20} className="text-oriental-black" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-oriental-red rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">{BRANDING.iniciales}</span>
            </div>
            <span className="font-bold text-oriental-black text-sm tracking-tight">Centro de Mando</span>
          </div>
        </div>

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
