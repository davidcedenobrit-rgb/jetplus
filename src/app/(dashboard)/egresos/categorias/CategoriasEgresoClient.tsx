'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ListChecks, Check, X, Pencil, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react'
import { renombrarCategoria, toggleCategoria, moverCategoria } from './actions'

export type CategoriaRow = { clave: string; nombre: string; activo: boolean; orden: number }

export default function CategoriasEgresoClient({ inicial }: { inicial: CategoriaRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)

  const refrescar = () => startTransition(() => router.refresh())

  async function guardarNombre(clave: string) {
    setTrabajando(clave)
    await renombrarCategoria(clave, texto)
    setEditando(null); setTrabajando(null); refrescar()
  }
  async function toggle(clave: string, activo: boolean) {
    setTrabajando(clave)
    await toggleCategoria(clave, activo)
    setTrabajando(null); refrescar()
  }
  async function mover(clave: string, dir: 'arriba' | 'abajo') {
    setTrabajando(clave)
    await moverCategoria(clave, dir)
    setTrabajando(null); refrescar()
  }

  const activas = inicial.filter(c => c.activo).length

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><ListChecks size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Categorías de egreso</h1>
            <p className="text-oriental-gray text-sm">{activas} activas de {inicial.length} · renombra, ordena y oculta las que no uses</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Las <b>desactivadas</b> dejan de aparecer al registrar egresos nuevos, pero los egresos anteriores conservan su categoría. No se borran datos.
      </div>

      <div className="card divide-y divide-gray-100">
        {inicial.map((c, i) => (
          <div key={c.clave} className={`flex items-center gap-3 px-4 py-2.5 ${!c.activo ? 'opacity-55' : ''}`}>
            <div className="flex flex-col">
              <button onClick={() => mover(c.clave, 'arriba')} disabled={i === 0 || pending} className="text-oriental-gray hover:text-oriental-black disabled:opacity-30"><ChevronUp size={15} /></button>
              <button onClick={() => mover(c.clave, 'abajo')} disabled={i === inicial.length - 1 || pending} className="text-oriental-gray hover:text-oriental-black disabled:opacity-30"><ChevronDown size={15} /></button>
            </div>

            <div className="flex-1 min-w-0">
              {editando === c.clave ? (
                <div className="flex items-center gap-2">
                  <input value={texto} onChange={e => setTexto(e.target.value)} className="input py-1 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') guardarNombre(c.clave); if (e.key === 'Escape') setEditando(null) }} />
                  <button onClick={() => guardarNombre(c.clave)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white">{trabajando === c.clave ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                  <button onClick={() => setEditando(null)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-oriental-gray"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-oriental-black text-sm">{c.nombre}</span>
                  <span className="text-[10px] font-mono text-gray-400">{c.clave}</span>
                </div>
              )}
            </div>

            {editando !== c.clave && (
              <>
                <button onClick={() => { setEditando(c.clave); setTexto(c.nombre) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-oriental-gray" title="Renombrar"><Pencil size={14} /></button>
                <button onClick={() => toggle(c.clave, !c.activo)} disabled={trabajando === c.clave} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${c.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`} title={c.activo ? 'Desactivar' : 'Activar'}>
                  {c.activo ? <Eye size={13} /> : <EyeOff size={13} />} {c.activo ? 'Activa' : 'Oculta'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
