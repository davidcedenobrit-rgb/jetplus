'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sanitizeSearch } from '@/lib/utils'
import { UserPlus, Search, X, Loader2, CheckCircle2 } from 'lucide-react'

export default function VincularCliente({ vehiculoId }: { vehiculoId: string }) {
  const supabase = createClient()
  const router   = useRouter()
  const [abierto, setAbierto]   = useState(false)
  const [query, setQuery]       = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [seleccionado, setSeleccionado] = useState<any | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (query.length < 2 || seleccionado) { setClientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes').select('id, nombre, cedula_rif')
        .or(`nombre.ilike.%${sanitizeSearch(query)}%,cedula_rif.ilike.%${sanitizeSearch(query)}%`)
        .eq('activo', true).limit(8)
      setClientes(data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [query, seleccionado])

  async function vincular() {
    if (!seleccionado) return
    setLoading(true); setError('')
    const { error: err } = await supabase
      .from('vehiculos')
      .update({ cliente_id: seleccionado.id, updated_at: new Date().toISOString() })
      .eq('id', vehiculoId)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-oriental-red/40 text-oriental-red text-sm font-semibold hover:border-oriental-red hover:bg-red-50 transition-colors">
        <UserPlus size={15} /> Vincular cliente
      </button>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-oriental-black">Vincular cliente</p>
        <button onClick={() => { setAbierto(false); setQuery(''); setSeleccionado(null); setError('') }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200">
          <X size={14} className="text-oriental-gray" />
        </button>
      </div>

      {!seleccionado ? (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input type="text" className="input pl-9 text-sm" placeholder="Buscar por nombre o cédula…"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          {clientes.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto">
              {clientes.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { setSeleccionado(c); setQuery(c.nombre); setClientes([]) }}
                  className="w-full text-left px-4 py-3 hover:bg-oriental-bg transition-colors border-b border-gray-50 last:border-0">
                  <p className="font-semibold text-oriental-black text-sm">{c.nombre}</p>
                  <p className="text-xs text-oriental-gray">{c.cedula_rif}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <div>
            <p className="font-semibold text-oriental-black text-sm">{seleccionado.nombre}</p>
            <p className="text-xs text-oriental-gray">{seleccionado.cedula_rif}</p>
          </div>
          <button onClick={() => { setSeleccionado(null); setQuery('') }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-100">
            <X size={13} className="text-oriental-gray" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button onClick={vincular} disabled={!seleccionado || loading}
        className="w-full py-2.5 rounded-xl bg-oriental-red hover:bg-red-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {loading ? 'Vinculando…' : 'Confirmar vinculación'}
      </button>
    </div>
  )
}
