'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X, Loader2, Search } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Candidato = {
  vehiculoId: string
  clienteNombre: string
  clienteCedula: string
  marca: string
  modelo: string
  tienePlaca: boolean
}

// Asignar el carro del showroom a un cliente con crédito AC500 (ya vendido a plazos).
export default function AsignarClienteAC500({ showroomId, vehiculoLabel }: { showroomId: string; vehiculoLabel: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cargando, setCargando] = useState(false)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCargando(true); setError('')
    supabase
      .from('creditos')
      .select('vehiculo_id, plan_tipo, estado, vehiculos(id, marca, modelo, placa), clientes(nombre, cedula_rif)')
      .eq('plan_tipo', 'asegurate_500')
      .eq('estado', 'activo')
      .then(({ data }) => {
        const list: Candidato[] = (data ?? [])
          .filter((c: any) => c.vehiculos)
          .map((c: any) => ({
            vehiculoId: c.vehiculos.id,
            clienteNombre: c.clientes?.nombre ?? '—',
            clienteCedula: c.clientes?.cedula_rif ?? '',
            marca: c.vehiculos.marca ?? '',
            modelo: c.vehiculos.modelo ?? '',
            tienePlaca: !!c.vehiculos.placa,
          }))
          .filter((c: Candidato) => !c.tienePlaca) // solo los que aún no tienen carro físico
        setCandidatos(list)
        setCargando(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtrados = useMemo(() => {
    const nq = q.trim().toLowerCase()
    if (!nq) return candidatos
    return candidatos.filter(c =>
      c.clienteNombre.toLowerCase().includes(nq) || c.clienteCedula.toLowerCase().includes(nq) ||
      `${c.marca} ${c.modelo}`.toLowerCase().includes(nq))
  }, [candidatos, q])

  async function asignar(c: Candidato) {
    if (!window.confirm(`Asignar ${vehiculoLabel} a ${c.clienteNombre}? Se copiarán la placa y datos del carro a su vehículo y el showroom quedará vendido.`)) return
    setSaving(c.vehiculoId); setError('')
    try {
      const r = await fetch(`/api/showroom/${showroomId}/asignar-cliente`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehiculoId: c.vehiculoId }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error ?? 'No se pudo asignar'); setSaving(''); return }
      setOpen(false); setSaving('')
      router.refresh()
    } catch { setError('Error de conexión'); setSaving('') }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl text-sm transition-colors">
        <UserPlus size={16} /> Asignar a cliente (crédito AC500)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><UserPlus size={16} className="text-blue-800" /> Asignar carro a cliente AC500</h2>
                <p className="text-xs text-oriental-gray">{vehiculoLabel}</p>
              </div>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Clientes con crédito Asegúrate $500 activo que aún no tienen carro físico asignado. Al asignar, la placa y datos de este carro se copian a su vehículo.</p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por cliente, cédula o modelo…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oriental-red" />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {cargando ? (
                <p className="text-center text-sm text-gray-400 py-6">Cargando clientes…</p>
              ) : filtrados.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No hay clientes AC500 pendientes de asignar carro.</p>
              ) : (
                <div className="space-y-2">
                  {filtrados.map(c => (
                    <div key={c.vehiculoId} className="flex items-center justify-between gap-2 border border-gray-200 rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-oriental-black text-sm truncate">{c.clienteNombre}</p>
                        <p className="text-xs text-gray-500 truncate">{c.clienteCedula} · {c.marca} {c.modelo}</p>
                      </div>
                      <button onClick={() => asignar(c)} disabled={!!saving}
                        className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1.5">
                        {saving === c.vehiculoId && <Loader2 size={12} className="animate-spin" />} Asignar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
