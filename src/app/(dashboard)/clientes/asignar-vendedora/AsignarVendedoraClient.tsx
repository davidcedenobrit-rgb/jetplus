'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { asignarVendedora } from './actions'

interface Cliente {
  id: string
  nombre: string
  cedula_rif: string
  telefono: string | null
  vendedor_codigo: string | null
  tipo: string
}
interface Vendedora { codigo: string; nombre: string }

type Filtro = 'sin_asignar' | 'asignados' | 'todos'

function norm(s: string) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function AsignarVendedoraClient({ clientes: clientesIniciales, vendedoras, sugerencias }: {
  clientes: Cliente[]
  vendedoras: Vendedora[]
  sugerencias: Record<string, string>
}) {
  const [clientes, setClientes] = useState(clientesIniciales)
  const [filtro, setFiltro] = useState<Filtro>('sin_asignar')
  const [q, setQ] = useState('')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [codigoMasivo, setCodigoMasivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const nombreVendedora = useMemo(() => new Map(vendedoras.map(v => [v.codigo, v.nombre])), [vendedoras])

  const contadores = useMemo(() => ({
    sinAsignar: clientes.filter(c => !c.vendedor_codigo).length,
    asignados: clientes.filter(c => c.vendedor_codigo).length,
    todos: clientes.length,
  }), [clientes])

  const filtrados = useMemo(() => {
    const nq = norm(q.trim())
    return clientes.filter(c => {
      if (filtro === 'sin_asignar' && c.vendedor_codigo) return false
      if (filtro === 'asignados' && !c.vendedor_codigo) return false
      if (!nq) return true
      return norm(c.nombre).includes(nq) || norm(c.cedula_rif).includes(nq)
    })
  }, [clientes, filtro, q])

  const visiblesSeleccionables = filtrados.map(c => c.id)
  const todosVisiblesSeleccionados = visiblesSeleccionables.length > 0 && visiblesSeleccionables.every(id => seleccion.has(id))

  function toggleUno(id: string) {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleTodosVisibles() {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (todosVisiblesSeleccionados) visiblesSeleccionables.forEach(id => next.delete(id))
      else visiblesSeleccionables.forEach(id => next.add(id))
      return next
    })
  }

  function aplicarLocal(ids: string[], codigo: string) {
    setClientes(prev => prev.map(c => ids.includes(c.id) ? { ...c, vendedor_codigo: codigo } : c))
  }

  function asignarMasivo() {
    if (!codigoMasivo || seleccion.size === 0) return
    const ids = Array.from(seleccion)
    setMensaje(null)
    startTransition(async () => {
      const res = await asignarVendedora(ids, codigoMasivo)
      if (res.ok) {
        aplicarLocal(ids, codigoMasivo)
        setSeleccion(new Set())
        setMensaje({ tipo: 'ok', texto: `${ids.length} cliente(s) asignado(s) a ${nombreVendedora.get(codigoMasivo) ?? codigoMasivo}.` })
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al asignar' })
      }
    })
  }

  function asignarUno(clienteId: string, codigo: string) {
    if (!codigo) return
    setMensaje(null)
    startTransition(async () => {
      const res = await asignarVendedora([clienteId], codigo)
      if (res.ok) aplicarLocal([clienteId], codigo)
      else setMensaje({ tipo: 'error', texto: res.error ?? 'Error al asignar' })
    })
  }

  const conSugerenciaVisible = filtrados.filter(c => !c.vendedor_codigo && sugerencias[c.id])

  function aplicarSugerenciasEnBloque() {
    if (conSugerenciaVisible.length === 0) return
    setMensaje(null)
    // Se agrupan por código sugerido para hacer un update por grupo.
    const grupos = new Map<string, string[]>()
    for (const c of conSugerenciaVisible) {
      const cod = sugerencias[c.id]
      if (!grupos.has(cod)) grupos.set(cod, [])
      grupos.get(cod)!.push(c.id)
    }
    startTransition(async () => {
      let totalOk = 0
      const errores: string[] = []
      for (const [cod, ids] of grupos) {
        const res = await asignarVendedora(ids, cod)
        if (res.ok) { aplicarLocal(ids, cod); totalOk += ids.length }
        else errores.push(res.error ?? 'error')
      }
      setMensaje(errores.length
        ? { tipo: 'error', texto: `Se asignaron ${totalOk}, pero hubo errores: ${errores.join(', ')}` }
        : { tipo: 'ok', texto: `${totalOk} cliente(s) asignado(s) según su vendedora sugerida.` })
    })
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-oriental-gray hover:text-oriental-black mb-4">
        <ArrowLeft size={14} /> Volver a Clientes
      </Link>
      <h1 className="text-2xl font-bold text-oriental-black mb-1">Repartir clientes</h1>
      <p className="text-oriental-gray text-sm mb-6">Asigna la vendedora dueña de cada cliente histórico. Solo dirección puede hacer esto.</p>

      {mensaje && (
        <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Filtros por estado */}
      <div className="flex gap-2 mb-4">
        {([
          ['sin_asignar', `Sin asignar (${contadores.sinAsignar})`],
          ['asignados', `Asignados (${contadores.asignados})`],
          ['todos', `Todos (${contadores.todos})`],
        ] as [Filtro, string][]).map(([k, label]) => (
          <button key={k} onClick={() => { setFiltro(k); setSeleccion(new Set()) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtro === k ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o cédula/RIF..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-oriental-red focus:ring-1 focus:ring-oriental-red/20" />
      </div>

      {/* Barra de acciones masivas */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-oriental-black cursor-pointer select-none">
          <input type="checkbox" checked={todosVisiblesSeleccionados} onChange={toggleTodosVisibles} className="w-4 h-4" />
          Seleccionar visibles ({seleccion.size} seleccionados)
        </label>
        <div className="flex-1" />
        <select value={codigoMasivo} onChange={e => setCodigoMasivo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">Asignar a…</option>
          {vendedoras.map(v => <option key={v.codigo} value={v.codigo}>{v.nombre} ({v.codigo})</option>)}
        </select>
        <button onClick={asignarMasivo} disabled={!codigoMasivo || seleccion.size === 0 || isPending}
          className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
          Asignar seleccionados
        </button>
        {conSugerenciaVisible.length > 0 && (
          <button onClick={aplicarSugerenciasEnBloque} disabled={isPending}
            className="text-sm font-semibold text-oriental-red hover:underline disabled:opacity-40">
            Aplicar sugerencias ({conSugerenciaVisible.length})
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map(c => {
          const sugerida = sugerencias[c.id]
          return (
            <div key={c.id} className="card p-4 flex items-center gap-3 flex-wrap">
              <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => toggleUno(c.id)} className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-oriental-black truncate">{c.nombre}</p>
                <p className="text-xs text-oriental-gray">{c.cedula_rif}{c.telefono ? ` · ${c.telefono}` : ''}</p>
              </div>
              {c.vendedor_codigo ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                  <Check size={12} /> {nombreVendedora.get(c.vendedor_codigo) ?? c.vendedor_codigo}
                </span>
              ) : sugerida ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Sugerida: {nombreVendedora.get(sugerida) ?? sugerida}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Sin asignar</span>
              )}
              <select
                defaultValue=""
                onChange={e => { if (e.target.value) asignarUno(c.id, e.target.value); e.target.value = '' }}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
              >
                <option value="">Cambiar…</option>
                {vendedoras.map(v => <option key={v.codigo} value={v.codigo}>{v.nombre}</option>)}
              </select>
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <p className="text-center text-oriental-gray text-sm py-16">No hay clientes en este filtro.</p>
        )}
      </div>
    </div>
  )
}
