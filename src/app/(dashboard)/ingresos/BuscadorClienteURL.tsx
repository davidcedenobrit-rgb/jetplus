'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Props {
  paramName?: string
  placeholder?: string
  className?: string
}

export default function BuscadorClienteURL({
  paramName = 'cliente',
  placeholder = 'Buscar cliente por nombre o cédula/RIF…',
  className = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get(paramName) ?? ''
  const [valor, setValor] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValor(searchParams.get(paramName) ?? '')
  }, [searchParams, paramName])

  function aplicar(v: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (v.trim()) params.set(paramName, v.trim())
    else params.delete(paramName)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function onChange(v: string) {
    setValor(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => aplicar(v), 350)
  }

  function limpiar() {
    setValor('')
    if (timerRef.current) clearTimeout(timerRef.current)
    aplicar('')
  }

  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
      <input
        type="text"
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 bg-white text-sm text-oriental-black placeholder-gray-400 focus:outline-none focus:border-oriental-red focus:ring-1 focus:ring-oriental-red/20"
      />
      {valor && (
        <button
          onClick={limpiar}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oriental-red"
          title="Limpiar búsqueda"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
