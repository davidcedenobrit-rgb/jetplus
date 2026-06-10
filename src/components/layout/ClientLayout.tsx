'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

interface ClientLayoutProps {
  children: React.ReactNode
  userEmail: string
  rol: string
  aprobacionesPendientes: number
  depositosPendientesCarla: number
  anulacionesPendientes: number
}

export default function ClientLayout({
  children,
  userEmail,
  rol,
  aprobacionesPendientes,
  depositosPendientesCarla,
  anulacionesPendientes,
}: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
              <span className="text-white text-[9px] font-bold">LO</span>
            </div>
            <span className="font-bold text-oriental-black text-sm tracking-tight">Centro de Mando</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
