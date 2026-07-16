'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wallet, Search, X, Check, Loader2, ArrowDownCircle, ArrowUpCircle, Settings2, Banknote, Coins } from 'lucide-react'
import { conciliarMovimiento, asignarCuenta, type Cuenta } from './actions'

export interface Movimiento {
  tipo: 'ingreso' | 'egreso'
  id: string
  numero: string | null
  fecha: string | null
  concepto: string | null
  contraparte: string | null
  metodo: string | null
  moneda: string
  monto: number
  banco: string | null
  estado: string | null
  cuenta_id: string | null
  conciliado: boolean
  conciliado_por: string | null
  conciliado_at: string | null
}

interface Props {
  movimientos: Movimiento[]
  cuentas: Cuenta[]
}

function fmt(m: number, cur: string) {
  const s = Math.abs(m).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sign = m < 0 ? '−' : ''
  const pre = cur === 'VES' ? 'Bs. ' : cur === 'USDT' ? 'USDT ' : '$'
  return `${sign}${pre}${s}`
}

const tipoIcono: Record<string, string> = { banco: '🏦', usdt: '₮', efectivo: '💵', otro: '•' }

const LIMITE = 500

export default function MovimientosClient({ movimientos, cuentas }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [trabajando, setTrabajando] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [fCuenta, setFCuenta] = useState('')      // cuenta_id | 'sin' | ''
  const [fTipo, setFTipo] = useState('')          // 'ingreso' | 'egreso' | ''
  const [fConcil, setFConcil] = useState('')      // 'si' | 'no' | ''
  const [fMoneda, setFMoneda] = useState('')      // 'USD' | 'VES' | 'USDT' | ''
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cuentaById = useMemo(() => Object.fromEntries(cuentas.map(c => [c.id, c])), [cuentas])

  // Saldo por cuenta (sobre todos los movimientos, sin filtrar)
  const saldoPorCuenta = useMemo(() => {
    const m: Record<string, number> = {}
    for (const mv of movimientos) {
      if (!mv.cuenta_id) continue
      m[mv.cuenta_id] = (m[mv.cuenta_id] ?? 0) + (mv.tipo === 'ingreso' ? mv.monto : -mv.monto)
    }
    return m
  }, [movimientos])

  // Movimientos sin cuenta agrupados por moneda
  const sinCuentaPorMoneda = useMemo(() => {
    const m: Record<string, { total: number; n: number }> = {}
    for (const mv of movimientos) {
      if (mv.cuenta_id) continue
      const k = mv.moneda
      if (!m[k]) m[k] = { total: 0, n: 0 }
      m[k].total += mv.tipo === 'ingreso' ? mv.monto : -mv.monto
      m[k].n += 1
    }
    return m
  }, [movimientos])

  const pendientesConciliar = useMemo(() => movimientos.filter(m => !m.conciliado).length, [movimientos])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return movimientos.filter(mv => {
      if (fTipo && mv.tipo !== fTipo) return false
      if (fMoneda && mv.moneda !== fMoneda) return false
      if (fCuenta === 'sin' && mv.cuenta_id) return false
      if (fCuenta && fCuenta !== 'sin' && mv.cuenta_id !== fCuenta) return false
      if (fConcil === 'si' && !mv.conciliado) return false
      if (fConcil === 'no' && mv.conciliado) return false
      if (desde && (mv.fecha ?? '') < desde) return false
      if (hasta && (mv.fecha ?? '') > hasta) return false
      if (q) {
        const hay = (mv.numero ?? '').toLowerCase().includes(q)
          || (mv.concepto ?? '').toLowerCase().includes(q)
          || (mv.contraparte ?? '').toLowerCase().includes(q)
          || (mv.banco ?? '').toLowerCase().includes(q)
        if (!hay) return false
      }
      return true
    })
  }, [movimientos, busqueda, fTipo, fMoneda, fCuenta, fConcil, desde, hasta])

  const visibles = filtradas.slice(0, LIMITE)
  const hayFiltro = busqueda || fCuenta || fTipo || fConcil || fMoneda || desde || hasta

  function limpiar() {
    setBusqueda(''); setFCuenta(''); setFTipo(''); setFConcil(''); setFMoneda(''); setDesde(''); setHasta('')
  }

  function toggleConciliado(mv: Movimiento) {
    setTrabajando(mv.id)
    startTransition(async () => {
      await conciliarMovimiento(mv.tipo, mv.id, !mv.conciliado)
      router.refresh()
      setTrabajando(null)
    })
  }

  function cambiarCuenta(mv: Movimiento, cuentaId: string) {
    setTrabajando(mv.id)
    startTransition(async () => {
      await asignarCuenta(mv.tipo, mv.id, cuentaId || null)
      router.refresh()
      setTrabajando(null)
    })
  }

  const fmtFecha = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Movimientos y conciliación</h1>
            <p className="text-oriental-gray text-sm">
              {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} · {pendientesConciliar} por conciliar
            </p>
          </div>
        </div>
        <Link href="/movimientos/cuentas" className="btn-secondary flex items-center gap-2 text-sm">
          <Settings2 size={15} /> Cuentas
        </Link>
      </div>

      {/* Saldos por cuenta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {cuentas.map(c => (
          <button key={c.id} onClick={() => setFCuenta(fCuenta === c.id ? '' : c.id)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${fCuenta === c.id ? 'border-oriental-red bg-oriental-red/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{tipoIcono[c.tipo] ?? '•'}</span>
              <p className="text-[11px] font-bold text-oriental-black truncate flex-1">{c.nombre}</p>
              <span className="text-[9px] font-bold text-oriental-gray bg-gray-100 px-1 py-0.5 rounded">{c.moneda}</span>
            </div>
            {c.custodio && <p className="text-[10px] text-oriental-gray truncate mb-0.5">{c.custodio}</p>}
            <p className={`text-base font-black ${(saldoPorCuenta[c.id] ?? 0) < 0 ? 'text-red-600' : 'text-oriental-black'}`}>
              {fmt(saldoPorCuenta[c.id] ?? 0, c.moneda)}
            </p>
          </button>
        ))}
        {Object.entries(sinCuentaPorMoneda).map(([mon, v]) => (
          <button key={`sin-${mon}`} onClick={() => { setFCuenta('sin'); setFMoneda(mon) }}
            className={`text-left p-3 rounded-xl border-2 border-dashed transition-all ${fCuenta === 'sin' && fMoneda === mon ? 'border-amber-400 bg-amber-50' : 'border-amber-200 hover:border-amber-300 bg-amber-50/40'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">⚠️</span>
              <p className="text-[11px] font-bold text-amber-800 truncate flex-1">Sin cuenta</p>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">{mon}</span>
            </div>
            <p className="text-[10px] text-amber-700 mb-0.5">{v.n} mov. por asignar</p>
            <p className="text-base font-black text-amber-800">{fmt(v.total, mon)}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por número, concepto, cliente/beneficiario o banco…" className="input pl-9" />
          </div>
          {hayFiltro && (
            <button onClick={limpiar} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-oriental-gray hover:bg-gray-50 text-xs font-semibold whitespace-nowrap">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="select text-sm py-1.5 w-auto" value={fCuenta} onChange={e => setFCuenta(e.target.value)}>
            <option value="">Todas las cuentas</option>
            <option value="sin">Sin cuenta</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="select text-sm py-1.5 w-auto" value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Ingresos y egresos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="egreso">Solo egresos</option>
          </select>
          <select className="select text-sm py-1.5 w-auto" value={fMoneda} onChange={e => setFMoneda(e.target.value)}>
            <option value="">Toda moneda</option>
            <option value="USD">USD</option>
            <option value="VES">VES</option>
            <option value="USDT">USDT</option>
          </select>
          <select className="select text-sm py-1.5 w-auto" value={fConcil} onChange={e => setFConcil(e.target.value)}>
            <option value="">Conciliadas y no</option>
            <option value="no">Por conciliar</option>
            <option value="si">Conciliadas</option>
          </select>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input text-sm py-1.5 w-auto" title="Desde" />
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input text-sm py-1.5 w-auto" title="Hasta" />
        </div>
        <p className="text-[11px] text-oriental-gray mt-2">
          Mostrando {visibles.length} de {filtradas.length}{filtradas.length > LIMITE ? ` (limitado a ${LIMITE})` : ''}
        </p>
      </div>

      {/* Tabla */}
      {visibles.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet size={30} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-gray text-sm">Sin movimientos con estos filtros.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Fecha</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Movimiento</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Cuenta</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Monto</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-medium text-oriental-gray">Conciliado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibles.map(mv => {
                  const esIng = mv.tipo === 'ingreso'
                  const cuenta = mv.cuenta_id ? cuentaById[mv.cuenta_id] : null
                  const ocupado = trabajando === mv.id && pending
                  return (
                    <tr key={`${mv.tipo}-${mv.id}`} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-oriental-gray">{fmtFecha(mv.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {esIng ? <ArrowDownCircle size={13} className="text-green-600 flex-shrink-0" /> : <ArrowUpCircle size={13} className="text-red-600 flex-shrink-0" />}
                          <span className="font-mono text-[11px] font-bold text-oriental-black">{mv.numero ?? '—'}</span>
                        </div>
                        <p className="text-xs text-oriental-black mt-0.5">{mv.concepto ?? '—'}</p>
                        <p className="text-[11px] text-oriental-gray">
                          {[mv.contraparte, mv.metodo, mv.banco].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={mv.cuenta_id ?? ''}
                          disabled={ocupado}
                          onChange={e => cambiarCuenta(mv, e.target.value)}
                          className={`text-xs rounded-lg border px-2 py-1.5 max-w-[150px] ${mv.cuenta_id ? 'border-gray-200 bg-white text-oriental-black' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                          <option value="">— Sin cuenta —</option>
                          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.moneda})</option>)}
                        </select>
                        {cuenta && cuenta.moneda !== mv.moneda && (
                          <p className="text-[10px] text-red-600 mt-0.5">⚠ Moneda ({mv.moneda}) ≠ cuenta ({cuenta.moneda})</p>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-right whitespace-nowrap font-bold ${esIng ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(esIng ? mv.monto : -mv.monto, mv.moneda)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggleConciliado(mv)}
                          disabled={ocupado}
                          title={mv.conciliado ? `Conciliado por ${mv.conciliado_por ?? '—'}` : 'Marcar como conciliado'}
                          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-colors ${mv.conciliado ? 'bg-green-600 text-white' : 'border-2 border-gray-300 hover:border-green-500'}`}>
                          {ocupado ? <Loader2 size={12} className="animate-spin" /> : mv.conciliado ? <Check size={13} /> : null}
                        </button>
                        {mv.conciliado && mv.conciliado_por && (
                          <p className="text-[9px] text-oriental-gray mt-0.5 max-w-[90px] truncate mx-auto">{mv.conciliado_por.split('@')[0]}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
