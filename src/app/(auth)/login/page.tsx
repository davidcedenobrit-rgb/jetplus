'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car } from 'lucide-react'
import { LoginSchema } from '@/lib/validations'
import { BRANDING } from '@/lib/branding'
import { RUTA_POST_LOGIN } from '@/lib/menu-config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const parsed = LoginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Datos inválidos')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push(RUTA_POST_LOGIN)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-oriental-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-oriental-red rounded-2xl mb-4">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">{BRANDING.nombre}</h1>
          <p className="text-oriental-gray text-sm mt-1">{BRANDING.sub}</p>
          <div className="w-12 h-0.5 bg-oriental-red mx-auto mt-3" />
        </div>

        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-white text-lg font-bold">Control Financiero</h2>
            <p className="text-oriental-gray text-sm mt-1">{BRANDING.ubicacion}</p>
          </div>

          <form onSubmit={handleLogin} className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                className="w-full bg-oriental-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-oriental-red/40 focus:border-oriental-red transition-colors"
                placeholder={BRANDING.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                className="w-full bg-oriental-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-oriental-red/40 focus:border-oriental-red transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-oriental-red/10 border border-oriental-red/20 rounded-lg px-3 py-2.5">
                <div className="w-1.5 h-1.5 bg-oriental-red rounded-full flex-shrink-0" />
                <p className="text-oriental-red text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-oriental-red text-white py-3 rounded-lg text-sm font-bold hover:bg-oriental-red-dark transition-colors disabled:opacity-50 mt-2"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Sistema privado — solo personal autorizado
        </p>
      </div>
    </div>
  )
}
