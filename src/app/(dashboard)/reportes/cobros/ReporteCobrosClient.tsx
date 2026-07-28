'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, CalendarRange, FileDown } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Modalidad del crédito → grupo de cobro.
const MODALIDAD: { key: string; label: string; planes: string[] }[] = [
  { key: 'todas', label: 'Todas', planes: [] },
  { key: 'la_oriental', label: 'Crédito La Oriental', planes: ['inicial_la_oriental', 'cuota_especial'] },
  { key: 'motor', label: 'Vehimotors', planes: ['financiamiento_vehimotors'] },
  { key: 'ac500', label: 'Asegúrate 500', planes: ['asegurate_500'] },
]
const PLAN_LABEL: Record<string, string> = {
  inicial_la_oriental: 'La Oriental', cuota_especial: 'Cuota especial',
  financiamiento_vehimotors: 'Vehimotors', asegurate_500: 'Asegúrate 500',
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const PAGE = 1000; let out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * PAGE, i * PAGE + PAGE - 1)
    if (!data || data.length === 0) break
    out = out.concat(data as T[]); if (data.length < PAGE) break
  }
  return out
}
const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function csv(nombre: string, headers: string[], rows: (string | number)[][]) {
  const c = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + c], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click(); URL.revokeObjectURL(url)
}

export default function ReporteCobrosClient() {
  const supabase = createClient()
  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1) // 1-12
  const [modalidad, setModalidad] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [cuotas, setCuotas] = useState<any[]>([])
  const [diaSel, setDiaSel] = useState<number | null>(null)

  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
  const diasMes = new Date(anio, mes, 0).getDate()
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(diasMes).padStart(2, '0')}`

  const cargar = useCallback(async () => {
    setLoading(true)
    const data = await fetchAll<any>((f, t) => supabase.from('cuotas')
      .select('monto, monto_pagado, estado, fecha_vencimiento, creditos(plan_tipo, clientes(nombre))')
      .gte('fecha_vencimiento', desde).lte('fecha_vencimiento', hasta).range(f, t))
    setCuotas(data); setLoading(false)
  }, [desde, hasta])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setDiaSel(null) }, [mes, anio, modalidad])

  const planesSel = MODALIDAD.find(m => m.key === modalidad)?.planes ?? []
  const filtradas = useMemo(() => cuotas.filter(c =>
    modalidad === 'todas' || planesSel.includes(c.creditos?.plan_tipo)
  ), [cuotas, modalidad])

  const datos = useMemo(() => {
    const porDia: Record<number, number> = {}
    let programado = 0, cobrado = 0
    const porCliente: Record<string, number> = {}
    for (const c of filtradas) {
      const dia = Number(String(c.fecha_vencimiento).slice(8, 10))
      const monto = Number(c.monto || 0)
      programado += monto
      cobrado += Number(c.monto_pagado || 0)
      porDia[dia] = (porDia[dia] ?? 0) + monto
      const cli = c.creditos?.clientes?.nombre || '—'
      porCliente[cli] = (porCliente[cli] ?? 0) + monto
    }
    const q1 = Object.entries(porDia).filter(([d]) => Number(d) <= 15).reduce((s, [, v]) => s + v, 0)
    const q2 = programado - q1
    const mejoresDias = Object.entries(porDia).map(([d, v]) => ({ dia: Number(d), monto: v })).sort((a, b) => b.monto - a.monto).slice(0, 5)
    const mejoresClientes = Object.entries(porCliente).map(([n, v]) => ({ nombre: n, monto: v })).sort((a, b) => b.monto - a.monto).slice(0, 8)
    return { porDia, programado, cobrado, pendiente: programado - cobrado, q1, q2, mejoresDias, mejoresClientes }
  }, [filtradas])

  // Por cobrar por modalidad y quincena (siempre sobre todas las modalidades)
  const porModQuincena = useMemo(() => {
    const init = () => ({ la_oriental: 0, motor: 0, ac500: 0, especial: 0, otros: 0 })
    const q1 = init(), q2 = init()
    for (const c of cuotas) {
      const dia = Number(String(c.fecha_vencimiento).slice(8, 10))
      const monto = Number(c.monto || 0)
      const plan = c.creditos?.plan_tipo
      const k = plan === 'inicial_la_oriental' ? 'la_oriental'
        : plan === 'financiamiento_vehimotors' ? 'motor'
        : plan === 'asegurate_500' ? 'ac500'
        : plan === 'cuota_especial' ? 'especial' : 'otros'
      ;(dia <= 15 ? q1 : q2)[k] += monto
    }
    return { q1, q2 }
  }, [cuotas])

  // Grilla del calendario
  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes - 1, 1).getDay() // 0=Dom
    const arr: (number | null)[] = Array(primerDia).fill(null)
    for (let d = 1; d <= diasMes; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [anio, mes, diasMes])

  const maxDia = Math.max(1, ...Object.values(datos.porDia))
  const periodo = `${MESES[mes - 1]} ${anio}`

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/reportes" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} className="text-oriental-gray" /></Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-xl flex items-center justify-center"><CalendarRange size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Cobros por quincena</h1>
            <p className="text-oriental-gray text-sm">Cuánto se cobra cada día del mes · {periodo} (USD)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div><label className="label">Mes</label>
          <select className="select" value={mes} onChange={e => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
        </div>
        <div><label className="label">Año</label>
          <select className="select" value={anio} onChange={e => setAnio(Number(e.target.value))}>{[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
        <div><label className="label">Modalidad</label>
          <select className="select" value={modalidad} onChange={e => setModalidad(e.target.value)}>{MODALIDAD.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
        </div>
      </div>

      {/* KPIs quincena */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">1ª quincena (1–15)</p><p className="text-xl font-black text-oriental-black">${fmt(datos.q1)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">2ª quincena (16–{diasMes})</p><p className="text-xl font-black text-oriental-black">${fmt(datos.q2)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Total del mes</p><p className="text-xl font-black text-green-700">${fmt(datos.programado)}</p></div>
        <div className="card p-4"><p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">Ya cobrado / pendiente</p><p className="text-sm font-bold text-oriental-black">${fmt(datos.cobrado)} <span className="text-oriental-gray font-normal">/</span> <span className="text-oriental-red">${fmt(datos.pendiente)}</span></p></div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-oriental-gray text-sm">Cargando…</div>
      ) : (
        <>
          {/* Calendario */}
          <div className="card p-4 mb-6">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase text-oriental-gray py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((d, i) => {
                if (d === null) return <div key={i} className="aspect-square rounded-lg bg-gray-50/50" />
                const monto = datos.porDia[d] ?? 0
                const intensidad = monto > 0 ? 0.12 + 0.6 * (monto / maxDia) : 0
                const activo = diaSel === d
                return (
                  <button key={i} type="button" disabled={monto === 0}
                    onClick={() => setDiaSel(activo ? null : d)}
                    className={`aspect-square rounded-lg border p-1.5 flex flex-col text-left transition-all ${monto > 0 ? 'cursor-pointer hover:ring-2 hover:ring-oriental-red/40' : 'cursor-default'} ${activo ? 'ring-2 ring-oriental-red' : d === 15 ? 'border-oriental-red/40' : 'border-gray-100'}`}
                    style={{ backgroundColor: monto > 0 ? `rgba(196,30,58,${intensidad})` : '#fff' }}>
                    <span className={`text-[11px] font-bold ${intensidad > 0.4 ? 'text-white' : 'text-oriental-black'}`}>{d}</span>
                    {monto > 0 && <span className={`text-[10px] font-semibold mt-auto ${intensidad > 0.4 ? 'text-white' : 'text-oriental-black'}`}>${fmt(monto)}</span>}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-oriental-gray mt-2">Haz clic en un día para ver a quién toca cobrar. Cada celda muestra el total a cobrar ese día (por vencimiento de cuotas). Más rojo = más cobro.</p>

            {/* Detalle del día seleccionado */}
            {diaSel !== null && (() => {
              const delDia = filtradas
                .filter(c => Number(String(c.fecha_vencimiento).slice(8, 10)) === diaSel)
                .sort((a, b) => Number(b.monto || 0) - Number(a.monto || 0))
              const totalDia = delDia.reduce((s, c) => s + Number(c.monto || 0), 0)
              const estadoCuota = (c: any) => {
                if (c.estado === 'pagada') return { t: 'Pagada', cls: 'bg-blue-100 text-blue-700' }
                if (c.estado === 'vencida') return { t: 'Vencida', cls: 'bg-red-100 text-red-700' }
                if (Number(c.monto_pagado || 0) > 0) return { t: 'Abono', cls: 'bg-amber-100 text-amber-700' }
                return { t: 'Pendiente', cls: 'bg-gray-100 text-gray-600' }
              }
              return (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-oriental-black text-sm">Cobros del {diaSel} de {MESES[mes - 1]} — <span className="text-green-700">${fmt(totalDia)}</span></h3>
                    <button onClick={() => setDiaSel(null)} className="text-xs text-oriental-gray hover:text-oriental-black">Cerrar ✕</button>
                  </div>
                  {delDia.length === 0 ? <p className="text-sm text-oriental-gray">Sin cobros ese día.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr>{['Cliente', 'Modalidad', 'Monto', 'Estado'].map((h, i) => <th key={i} className={`px-3 py-1.5 text-[11px] font-semibold text-oriental-gray ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {delDia.map((c, i) => {
                            const e = estadoCuota(c)
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-1.5 text-oriental-black truncate max-w-[200px]">{c.creditos?.clientes?.nombre ?? '—'}</td>
                                <td className="px-3 py-1.5 text-oriental-gray text-xs">{PLAN_LABEL[c.creditos?.plan_tipo] ?? 'Otro'}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">${fmt(Number(c.monto || 0))}</td>
                                <td className="px-3 py-1.5 text-right"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.cls}`}>{e.t}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Por cobrar por modalidad (por quincena) */}
          {([['1ª quincena (1–15)', porModQuincena.q1], [`2ª quincena (16–${diasMes})`, porModQuincena.q2]] as const).map(([titulo, q]) => {
            const items = [
              { label: 'La Oriental', v: q.la_oriental, cls: 'text-oriental-red' },
              { label: 'Vehimotors', v: q.motor, cls: 'text-indigo-700' },
              { label: 'Asegúrate 500', v: q.ac500, cls: 'text-blue-700' },
              { label: 'Cuotas especiales', v: q.especial, cls: 'text-amber-700' },
            ]
            if (q.otros > 0) items.push({ label: 'Otros', v: q.otros, cls: 'text-oriental-gray' })
            const tot = items.reduce((s, x) => s + x.v, 0)
            return (
              <div key={titulo} className="mb-5">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="font-bold text-oriental-black text-sm">Por cobrar — {titulo}</h2>
                  <span className="text-sm font-black text-green-700">${fmt(tot)}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {items.map(x => (
                    <div key={x.label} className="card p-4">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray mb-1">{x.label}</p>
                      <p className={`text-xl font-black ${x.cls}`}>${fmt(x.v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mejores fechas */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-oriental-black text-sm">Mejores fechas de cobro</h2>
                <button onClick={() => csv(`cobros_dias_${periodo}`, ['Día', 'Monto USD'], datos.mejoresDias.map(x => [`${x.dia} ${MESES[mes - 1]}`, x.monto.toFixed(2)]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
              </div>
              {datos.mejoresDias.length === 0 ? <p className="text-sm text-oriental-gray">Sin cobros.</p> : datos.mejoresDias.map(x => (
                <div key={x.dia} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-oriental-black">{x.dia} de {MESES[mes - 1]}</span>
                  <span className="font-semibold tabular-nums">${fmt(x.monto)}</span>
                </div>
              ))}
            </section>

            {/* Mejores clientes */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-oriental-black text-sm">Mejores clientes (por cobro del mes)</h2>
                <button onClick={() => csv(`cobros_clientes_${periodo}`, ['Cliente', 'Monto USD'], datos.mejoresClientes.map(x => [x.nombre, x.monto.toFixed(2)]))} className="text-xs font-semibold text-oriental-gray border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"><FileDown size={13} /> CSV</button>
              </div>
              {datos.mejoresClientes.length === 0 ? <p className="text-sm text-oriental-gray">Sin cobros.</p> : datos.mejoresClientes.map(x => (
                <div key={x.nombre} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-oriental-black truncate mr-2">{x.nombre}</span>
                  <span className="font-semibold tabular-nums flex-shrink-0">${fmt(x.monto)}</span>
                </div>
              ))}
            </section>
          </div>

          <p className="text-[11px] text-oriental-gray mt-4">
            Montos por fecha de vencimiento de las cuotas (cobro programado del mes). Filtra por modalidad para ver, por ejemplo, solo los créditos de La Oriental o del motor.
            Los montos se asumen en USD (moneda de los créditos).
          </p>
        </>
      )}
    </div>
  )
}
