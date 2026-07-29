'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PieChart, Check, X, Pencil, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Plus, Percent, Lock, KeyRound } from 'lucide-react'
import { crearCentro, renombrarCentro, toggleCentro, moverCentro, guardarReparto, configurarClaveReparto } from '../gestionar-actions'

export type CentroRow = { id: string; nombre: string; activo: boolean; orden: number | null; es_comun?: boolean; genera_ingreso?: boolean }
type RepartoRow = { centro_costo_id: string; porcentaje: number }

export default function GestionarCentrosClient({ inicial, repartoInicial = [], bloqueadoHasta = null, bloqueado = false, tieneClave = false }: { inicial: CentroRow[]; repartoInicial?: RepartoRow[]; bloqueadoHasta?: string | null; bloqueado?: boolean; tieneClave?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [creando, setCreando] = useState(false)

  // Centros de ingreso (los que reciben el reparto de gastos comunes)
  const centrosIngreso = inicial.filter(c => c.activo && c.genera_ingreso !== false && !c.es_comun)
  const [reparto, setReparto] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {}
    for (const c of inicial) if (c.activo && c.genera_ingreso !== false && !c.es_comun) base[c.id] = 0
    for (const r of repartoInicial) base[r.centro_costo_id] = r.porcentaje
    return base
  })
  const [guardandoRep, setGuardandoRep] = useState(false)
  const [repMsg, setRepMsg] = useState<string | null>(null)
  const [clave, setClave] = useState('')
  const sumaRep = Object.values(reparto).reduce((s, v) => s + (Number(v) || 0), 0)

  // Bloqueado y con clave: solo Rojas puede modificar (ingresando la clave)
  const bloqueoActivo = tieneClave && bloqueado

  async function guardarRep() {
    setGuardandoRep(true); setRepMsg(null)
    const rows = centrosIngreso.map(c => ({ centro_costo_id: c.id, porcentaje: Number(reparto[c.id]) || 0 }))
    const res = await guardarReparto(rows, clave || undefined)
    setGuardandoRep(false)
    setRepMsg(res && 'error' in res && res.error ? res.error : '✓ Reparto guardado')
    if (res && 'ok' in res) { setClave(''); refrescar() }
  }

  // Configurar / cambiar la clave especial de Rojas
  const [claveNueva, setClaveNueva] = useState('')
  const [claveActual, setClaveActual] = useState('')
  const [guardandoClave, setGuardandoClave] = useState(false)
  const [claveMsg, setClaveMsg] = useState<string | null>(null)
  const [mostrarClaveForm, setMostrarClaveForm] = useState(false)

  async function guardarClave() {
    setGuardandoClave(true); setClaveMsg(null)
    const res = await configurarClaveReparto(claveNueva, claveActual || undefined)
    setGuardandoClave(false)
    if (res && 'ok' in res) {
      setClaveMsg('✓ Clave guardada'); setClaveNueva(''); setClaveActual(''); setMostrarClaveForm(false); refrescar()
    } else {
      setClaveMsg(res && 'error' in res ? (res.error ?? 'Error') : 'Error')
    }
  }

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

      {/* Reparto de gastos comunes por % */}
      <div className="card p-4 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Percent size={16} className="text-oriental-red" />
          <h2 className="font-bold text-oriental-black">Reparto de gastos comunes</h2>
        </div>
        <p className="text-xs text-oriental-gray mb-3">
          Los gastos comunes (gastos fijos: alquiler, luz, agua, internet, vigilancia, nómina común) se reparten con estos % entre las líneas de ingreso cuando se pagan. Deben sumar 100%.
        </p>
        {bloqueoActivo && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span>El reparto está <b>bloqueado</b>{bloqueadoHasta ? ` hasta el ${new Date(bloqueadoHasta).toLocaleDateString('es-VE')}` : ''}. Solo Rojas puede modificarlo ingresando la clave especial.</span>
          </div>
        )}
        {centrosIngreso.length === 0 ? (
          <p className="text-sm text-oriental-gray">No hay centros de ingreso configurados.</p>
        ) : (
          <>
            <div className="space-y-2">
              {centrosIngreso.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-oriental-black">{c.nombre}</span>
                  <div className="relative w-28">
                    <input
                      type="number" min={0} max={100} step="0.01"
                      value={reparto[c.id] ?? 0}
                      onChange={e => setReparto(r => ({ ...r, [c.id]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="input py-1.5 pr-7 text-right"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-oriental-gray text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
            {bloqueoActivo && (
              <div className="mt-3">
                <label className="label">Clave de Rojas para desbloquear</label>
                <input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Clave especial" className="input py-1.5 max-w-xs" />
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className={`text-sm font-semibold ${Math.abs(sumaRep - 100) < 0.01 ? 'text-green-700' : 'text-oriental-red'}`}>
                Suma: {sumaRep.toFixed(2)}%
              </span>
              <div className="flex items-center gap-3">
                {repMsg && <span className={`text-xs ${repMsg.startsWith('✓') ? 'text-green-700' : 'text-oriental-red'}`}>{repMsg}</span>}
                <button onClick={guardarRep} disabled={guardandoRep || Math.abs(sumaRep - 100) > 0.01 || (bloqueoActivo && !clave)}
                  className="btn-primary flex items-center gap-1.5 py-2 px-4 text-sm disabled:opacity-50">
                  {guardandoRep ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar reparto
                </button>
              </div>
            </div>
            {/* Clave especial de Rojas */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              {!mostrarClaveForm ? (
                <button onClick={() => { setMostrarClaveForm(true); setClaveMsg(null) }} className="flex items-center gap-1.5 text-xs font-semibold text-oriental-gray hover:text-oriental-black">
                  <KeyRound size={13} /> {tieneClave ? 'Cambiar clave de Rojas' : 'Configurar clave de Rojas (para bloquear el %)'}
                </button>
              ) : (
                <div className="space-y-2 max-w-xs">
                  <p className="text-xs font-semibold text-oriental-black flex items-center gap-1.5"><KeyRound size={13} /> {tieneClave ? 'Cambiar clave de Rojas' : 'Configurar clave de Rojas'}</p>
                  {tieneClave && (
                    <input type="password" value={claveActual} onChange={e => setClaveActual(e.target.value)} placeholder="Clave actual" className="input py-1.5" />
                  )}
                  <input type="password" value={claveNueva} onChange={e => setClaveNueva(e.target.value)} placeholder="Clave nueva (mín. 4)" className="input py-1.5" />
                  <div className="flex items-center gap-2">
                    <button onClick={guardarClave} disabled={guardandoClave || claveNueva.trim().length < 4} className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs disabled:opacity-50">
                      {guardandoClave ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar clave
                    </button>
                    <button onClick={() => { setMostrarClaveForm(false); setClaveNueva(''); setClaveActual('') }} className="text-xs text-oriental-gray hover:text-oriental-black">Cancelar</button>
                    {claveMsg && <span className={`text-xs ${claveMsg.startsWith('✓') ? 'text-green-700' : 'text-oriental-red'}`}>{claveMsg}</span>}
                  </div>
                  <p className="text-[10px] text-oriental-gray">Con la clave configurada, cada vez que se guarde el reparto queda bloqueado un mes; solo Rojas lo desbloquea con esta clave.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
