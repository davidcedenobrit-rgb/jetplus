'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function CerrarSesionCliente() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function salir() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <button
      onClick={salir}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-700 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50"
    >
      <LogOut size={14} />
      {loading ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}
