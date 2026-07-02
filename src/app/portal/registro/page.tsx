'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, Lock, AlertCircle, Check } from 'lucide-react'

function RegistroInner() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = params.get('token')

  const [checking, setChecking] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [clienteNombre, setClienteNombre] = useState<string | null>(null)
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('Enlace inválido: falta el código de invitación')
      setChecking(false)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/portal-clientes/aceptar?token=${encodeURIComponent(token)}`)
        const j = await res.json()
        if (!res.ok) {
          setTokenError(j.error ?? 'Enlace inválido o expirado')
        } else {
          setClienteNombre(j.clienteNombre)
          if (j.correoSugerido) setCorreo(j.correoSugerido)
        }
      } catch {
        setTokenError('No se pudo validar la invitación')
      } finally {
        setChecking(false)
      }
    })()
  }, [token])

  async function crear() {
    setError(null)
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingrese un correo válido')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    const res = await fetch('/api/portal-clientes/aceptar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, correo, password }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(j.error ?? 'No se pudo crear la cuenta')
      return
    }
    // Login automático
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password,
    })
    if (loginErr) {
      setExito(true)
      return
    }
    router.push('/portal/inicio')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-oriental-red" />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={26} className="text-red-700" />
        </div>
        <h1 className="text-lg font-bold text-oriental-black mb-1">Enlace no válido</h1>
        <p className="text-sm text-oriental-gray mb-6">{tokenError}</p>
        <p className="text-xs text-oriental-gray">Contacte a su asesor para solicitar una nueva invitación.</p>
      </div>
    )
  }

  if (exito) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={26} className="text-green-700" />
        </div>
        <h1 className="text-lg font-bold text-oriental-black mb-1">Cuenta creada</h1>
        <p className="text-sm text-oriental-gray mb-6">Ya puede iniciar sesión.</p>
        <a href="/portal/login" className="px-6 py-3 bg-oriental-red text-white font-bold rounded-xl">Ir al inicio de sesión</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-oriental-red rounded-2xl mb-4 shadow-lg shadow-red-100">
          <span className="text-white font-black text-2xl">LO</span>
        </div>
        <h1 className="text-xl font-black text-oriental-black">Bienvenido/a</h1>
        {clienteNombre && (
          <p className="text-sm text-oriental-gray mt-1">{clienteNombre}</p>
        )}
        <p className="text-xs text-oriental-gray mt-3 leading-relaxed">
          Complete sus datos para activar su cuenta en el Portal del Cliente.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-oriental-gray uppercase tracking-wide mb-1.5">Correo electrónico</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email" autoComplete="email"
              value={correo} onChange={e => setCorreo(e.target.value)}
              placeholder="cliente@correo.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-oriental-gray uppercase tracking-wide mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-oriental-gray uppercase tracking-wide mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password" autoComplete="new-password"
              value={password2} onChange={e => setPassword2(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red focus:ring-2 focus:ring-red-100"
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
          onClick={crear}
          disabled={saving}
          className="w-full py-3.5 bg-oriental-red text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-100"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Creando cuenta…' : 'Activar mi cuenta'}
        </button>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={22} className="animate-spin text-oriental-red" /></div>}>
      <RegistroInner />
    </Suspense>
  )
}
