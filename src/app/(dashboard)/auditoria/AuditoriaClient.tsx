'use client'

import { useState, useMemo } from 'react'
import { Shield, User, Package, Car, CreditCard, CheckCircle2, Clock, TrendingDown, Ban, Search, FileDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type EventoAuditoria = {
  id: string
  modulo: string
  usuario: string
  accion: string
  detalle: string
  entidad: string
  fecha: string
}

const moduloConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  SORE:       { label: 'SORE',       color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Package },
  Showroom:   { label: 'Showroom',   color: 'text-purple-700', bg: 'bg-purple-100', icon: Car },
  Ingresos:   { label: 'Ingresos',   color: 'text-green-700',  bg: 'bg-green-100',  icon: CreditCard },
  Egresos:    { label: 'Egresos',    color: 'text-red-700',    bg: 'bg-red-100',    icon: TrendingDown },
  Aprobación: { label: 'Aprobación', color: 'text-orange-700', bg: 'bg-orange-100', icon: CheckCircle2 },
  Anulación:  { label: 'Anulación',  color: 'text-rose-700',   bg: 'bg-rose-100',   icon: Ban },
}

function timeAgo(fecha: string) {
  const now = new Date()
  const d = new Date(fecha)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const MODULOS = ['SORE', 'Showroom', 'Ingresos', 'Egresos', 'Aprobación', 'Anulación']

export default function AuditoriaClient({ eventos }: { eventos: EventoAuditoria[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [fModulo, setFModulo] = useState('')
  const [fUsuario, setFUsuario] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const usuarios = useMemo(() => Array.from(new Set(eventos.map(e => e.usuario))).sort(), [eventos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return eventos.filter(e => {
      if (fModulo && e.modulo !== fModulo) return false
      if (fUsuario && e.usuario !== fUsuario) return false
      if (desde && (e.fecha ?? '') < desde) return false
      if (hasta && (e.fecha ?? '') > hasta + 'T23:59:59') return false
      if (q) {
        const hay = e.accion.toLowerCase().includes(q) || e.detalle.toLowerCase().includes(q) || e.entidad.toLowerCase().includes(q) || e.usuario.toLowerCase().includes(q)
        if (!hay) return false
      }
      return true
    })
  }, [eventos, busqueda, fModulo, fUsuario, desde, hasta])

  const conteos = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of filtrados) c[e.modulo] = (c[e.modulo] ?? 0) + 1
    return c
  }, [filtrados])

  function exportarCsv() {
    const rows = filtrados.map(e => [e.fecha, e.modulo, e.usuario, e.accion, e.detalle, e.entidad])
    const csv = [['Fecha', 'Módulo', 'Usuario', 'Acción', 'Detalle', 'Referencia'], ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `auditoria.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const limpiar = () => { setBusqueda(''); setFModulo(''); setFUsuario(''); setDesde(''); setHasta('') }
  const hayFiltro = busqueda || fModulo || fUsuario || desde || hasta
  const visibles = filtrados.slice(0, 400)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><Shield size={20} className="text-oriental-red" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-oriental-black">Registros de Auditoría</h1>
          <p className="text-oriental-gray text-sm">Actividad de ingresos, egresos, aprobaciones, anulaciones, showroom y repuestos</p>
        </div>
        <button onClick={exportarCsv} disabled={filtrados.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-oriental-gray hover:bg-gray-50 disabled:opacity-50"><FileDown size={15} /> CSV</button>
      </div>

      {/* Resumen por módulo (clic para filtrar) */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
        {MODULOS.map(mod => {
          const cfg = moduloConfig[mod]
          const Icon = cfg.icon
          const activo = fModulo === mod
          return (
            <button key={mod} onClick={() => setFModulo(activo ? '' : mod)} className={`card p-3 flex items-center gap-2 text-left transition-all ${activo ? 'border-oriental-red bg-oriental-red/5' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}><Icon size={14} className={cfg.color} /></div>
              <div>
                <p className="text-[10px] text-oriental-gray font-medium">{cfg.label}</p>
                <p className="text-base font-extrabold text-oriental-black leading-none">{conteos[mod] ?? 0}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar acción, monto, recibo, cliente…" className="input pl-9" />
        </div>
        <div>
          <label className="label">Usuario</label>
          <select value={fUsuario} onChange={e => setFUsuario(e.target.value)} className="select min-w-[150px]">
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div><label className="label">Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input" /></div>
        <div><label className="label">Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input" /></div>
        {hayFiltro && <button onClick={limpiar} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-oriental-gray hover:bg-gray-50">Limpiar</button>}
      </div>

      <p className="text-[11px] text-oriental-gray mb-2 ml-1">{filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}{filtrados.length > visibles.length ? ` · mostrando ${visibles.length}` : ''}</p>

      {/* Feed */}
      <div className="card divide-y divide-gray-100">
        {visibles.length === 0 && <div className="p-12 text-center text-oriental-gray">No hay eventos con estos filtros.</div>}
        {visibles.map(ev => {
          const cfg = moduloConfig[ev.modulo] ?? { label: ev.modulo, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock }
          return (
            <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-oriental-black">{ev.accion}</p>
                {ev.detalle && <p className="text-xs text-oriental-gray mt-0.5 truncate">{ev.detalle}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <User size={11} className="text-gray-400" />
                  <span className="text-[11px] text-oriental-gray">{ev.usuario}</span>
                  {ev.entidad && (<><span className="text-gray-300">·</span><span className="text-[11px] font-mono text-oriental-gray">{ev.entidad}</span></>)}
                </div>
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">{timeAgo(ev.fecha)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
