'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Save, Package } from 'lucide-react'
import Link from 'next/link'

interface Item { descripcion: string; referencia: string; cantidad: number }

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [notas, setNotas]   = useState('')
  const [items, setItems]   = useState<Item[]>([{ descripcion: '', referencia: '', cantidad: 1 }])

  function addItem() { setItems(prev => [...prev, { descripcion: '', referencia: '', cantidad: 1 }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: keyof Item, val: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validos = items.filter(it => it.descripcion.trim())
    if (validos.length === 0) { setError('Agrega al menos un repuesto'); return }

    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setLoading(false); return }

    // Generar número
    const numero = `REP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`

    const { data: solicitud, error: err } = await supabase
      .from('solicitudes_repuestos')
      .insert({
        numero,
        estado: 'solicitado',
        solicitado_por_id: user.id,
        solicitado_por_email: user.email,
        notas_almacenista: notas || null,
      })
      .select()
      .single()

    if (err || !solicitud) { setError(err?.message ?? 'Error al crear'); setLoading(false); return }

    await supabase.from('repuestos_items').insert(
      validos.map(it => ({
        solicitud_id: solicitud.id,
        descripcion: it.descripcion.trim(),
        referencia: it.referencia.trim() || null,
        cantidad: it.cantidad,
      }))
    )

    await supabase.from('repuestos_historial').insert({
      solicitud_id: solicitud.id,
      estado_nuevo: 'solicitado',
      usuario_email: user.email,
      notas: `Solicitud creada con ${validos.length} repuesto${validos.length !== 1 ? 's' : ''}`,
    })

    router.push(`/repuestos/${solicitud.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/repuestos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Nueva solicitud de repuestos</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Se enviará a Vehimotors para cotización</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Repuestos solicitados
          </h2>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  {i === 0 && <label className="label">Descripción *</label>}
                  <input type="text" className="input" placeholder="Ej: Filtro de aceite" value={item.descripcion}
                    onChange={e => updateItem(i, 'descripcion', e.target.value)} required={i === 0} />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="label">Referencia</label>}
                  <input type="text" className="input font-mono text-sm" placeholder="Ref. pieza" value={item.referencia}
                    onChange={e => updateItem(i, 'referencia', e.target.value)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Cant.</label>}
                  <input type="number" className="input text-center font-bold" min="1" value={item.cantidad}
                    onChange={e => updateItem(i, 'cantidad', parseInt(e.target.value) || 1)} />
                </div>
                <div className={`col-span-1 ${i === 0 ? 'pt-6' : ''} flex items-center justify-center`}>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}
            className="mt-4 flex items-center gap-2 text-sm text-oriental-red font-semibold hover:underline">
            <Plus size={14} /> Agregar repuesto
          </button>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-oriental-red rounded-full" />
            Notas adicionales
          </h2>
          <textarea className="textarea" rows={3} placeholder="Observaciones, urgencia, detalles del vehículo, etc."
            value={notas} onChange={e => setNotas(e.target.value)} />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-oriental-red text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 py-3 px-6" disabled={loading}>
            <Save size={16} />
            {loading ? 'Guardando...' : 'Crear solicitud'}
          </button>
          <Link href="/repuestos" className="btn-secondary py-3 px-6">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
