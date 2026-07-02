'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function PortalHeader() {
  const supabase = createClient()
  const router = useRouter()
  const [salir, setSalir] = useState(false)

  async function cerrarSesion() {
    setSalir(true)
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-oriental-red rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">LO</span>
        </div>
        <div>
          <p className="text-xs font-black text-oriental-black leading-tight">LA ORIENTAL</p>
          <p className="text-[9px] text-oriental-gray leading-tight">MG & MAXUS</p>
        </div>
      </div>
      <button
        onClick={cerrarSesion}
        disabled={salir}
        className="text-gray-400 hover:text-oriental-red text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
      >
        <LogOut size={13} />
        Salir
      </button>
    </header>
  )
}
