'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPortalPage() {
  const supabase = createClient()
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function iniciarSesion() {
    setError(null)
    if (!correo.trim() || !password) {
      setError('Ingrese correo y contraseña')
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password,
    })
    if (err || !data.session) {
      setLoading(false)
      setError(err?.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : (err?.message ?? 'No se pudo iniciar sesión'))
      return
    }
    router.push('/portal/inicio')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-oriental-red rounded-2xl mb-4 shadow-lg shadow-red-100">
          <span className="text-white font-black text-2xl">LO</span>
        </div>
        <h1 className="text-2xl font-black text-oriental-black tracking-tight">Portal del Cliente</h1>
        <p className="text-sm text-oriental-gray mt-1">JETPLUS</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-oriental-gray uppercase tracking-wide mb-1.5">Correo</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              autoComplete="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              placeholder="cliente@correo.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red focus:ring-2 focus:ring-red-100 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-oriental-gray uppercase tracking-wide mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && iniciarSesion()}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red focus:ring-2 focus:ring-red-100 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={iniciarSesion}
          disabled={loading}
          className="w-full py-3.5 bg-oriental-red text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-100"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </div>

      <div className="mt-8 text-center space-y-3">
        <button className="text-xs font-semibold text-oriental-red hover:underline">
          ¿Olvidó su contraseña?
        </button>
        <p className="text-[11px] text-oriental-gray">
          ¿Aún no tiene cuenta? Solicítele el enlace de invitación a su asesor.
        </p>
      </div>
    </div>
  )
}
