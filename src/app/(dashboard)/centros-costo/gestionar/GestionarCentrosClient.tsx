'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PieChart, Check, X, Pencil, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Plus } from 'lucide-react'
import { crearCentro, renombrarCentro, toggleCentro, moverCentro } from '../gestionar-actions'

export type CentroRow = { id: string; nombre: string; activo: boolean; orden: number | null }

export default function GestionarCentrosClient({ inicial }: { inicial: CentroRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [creando, setCreando] = useState(false)

  const refrescar = () => startTransition(() => router.refresh())

  async function crear() {
    const n = nuevo.trim(); if (!n) return
    setCreando(true); await crearCentro(n); setNuevo(''); setCreando(false); refrescar()
  }
  async function guardarNombre(id: string) {
    setTrabajando(id); await renombrarCentro(id, texto); setEditando(null); setTrabajando(null); refrescar()
  }
  async function toggle(id: string, activo: boolean) {
    setTrabajando(id); await toggleCentro(id, activo); setTrabajando(null); refrescar()
  }
  async function mover(id: string, dir: 'arriba' | 'abajo') {
    setTrabajando(id); await moverCentro(id, dir); setTrabajando(null); refrescar()
  }

  const activos = inicial.filter(c => c.activo).length

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/centros-costo" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><PieChart size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Centros de costo</h1>
            <p className="text-oriental-gray text-sm">{activos} activos de {inicial.length} · crea, renombra, ordena y oculta</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Los <b>desactivados</b> dejan de aparecer al registrar ingresos/egresos nuevos, pero los registros anteriores conservan su centro. No se borran datos.
      </div>

      {/* Crear nuevo centro */}
      <div className="card p-3 mb-4 flex items-center gap-2">
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="Nuevo centro de costo (ej. Marketing)"
          className="input py-2 flex-1" onKeyDown={e => { if (e.key === 'Enter') crear() }} />
        <button onClick={crear} disabled={creando || !nuevo.trim()} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-sm disabled:opacity-50">
          {creando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
        </button>
      </div>

      <div className="card divide-y divide-gray-100">
        {inicial.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${!c.activo ? 'opacity-55' : ''}`}>
            <div className="flex flex-col">
              <button onClick={() => mover(c.id, 'arriba')} disabled={i === 0 || pending} className="text-oriental-gray hover:text-oriental-black disabled:opacity-30"><ChevronUp size={15} /></button>
              <button onClick={() => mover(c.id, 'abajo')} disabled={i === inicial.length - 1 || pending} className="text-oriental-gray hover:text-oriental-black disabled:opacity-30"><ChevronDown size={15} /></button>
            </div>

            <div className="flex-1 min-w-0">
              {editando === c.id ? (
                <div className="flex items-center gap-2">
                  <input value={texto} onChange={e => setTexto(e.target.value)} className="input py-1 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') guardarNombre(c.id); if (e.key === 'Escape') setEditando(null) }} />
                  <button onClick={() => guardarNombre(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white">{trabajando === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                  <button onClick={() => setEditando(null)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-oriental-gray"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-oriental-black text-sm">{c.nombre}</span>
                  <span className="text-[10px] font-mono text-gray-400">{c.id}</span>
                </div>
              )}
            </div>

            {editando !== c.id && (
              <>
                <button onClick={() => { setEditando(c.id); setTexto(c.nombre) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-oriental-gray" title="Renombrar"><Pencil size={14} /></button>
                <button onClick={() => toggle(c.id, !c.activo)} disabled={trabajando === c.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${c.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`} title={c.activo ? 'Desactivar' : 'Activar'}>
                  {c.activo ? <Eye size={13} /> : <EyeOff size={13} />} {c.activo ? 'Activo' : 'Oculto'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
