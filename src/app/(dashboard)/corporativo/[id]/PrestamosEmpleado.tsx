'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins, Plus, Loader2, X, Trash2, CheckCircle2 } from 'lucide-react'
import { listarPrestamos, crearPrestamo, abonarPrestamo, eliminarPrestamo, type Prestamo } from './prestamos-actions'

function fmt(n: number, moneda: string) {
  const s = Number(n).toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(Number(n)) * 100) % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })
  return moneda === 'VES' ? `Bs. ${s}` : `$${s}`
}
function fmtFecha(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PrestamosEmpleado({ empleadoId, empleadoNombre }: { empleadoId: string; empleadoNombre: string }) {
  const router = useRouter()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [abonoDe, setAbonoDe] = useState<string | null>(null)

  // form préstamo
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD')
  const [tasa, setTasa] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [registrarEgreso, setRegistrarEgreso] = useState(true)

  // form abono
  const [abMonto, setAbMonto] = useState('')
  const [abFecha, setAbFecha] = useState(new Date().toISOString().slice(0, 10))
  const [abNota, setAbNota] = useState('')

  async function recargar() {
    const { prestamos } = await listarPrestamos(empleadoId)
    setPrestamos(prestamos)
    setLoading(false)
  }
  useEffect(() => { recargar() }, [])

  const saldoTotalUSD = prestamos.reduce((s, p) => {
    const usd = p.moneda === 'VES' ? (p.tasa_cambio ? p.saldo / p.tasa_cambio : 0) : p.saldo
    return s + usd
  }, 0)

  async function guardarPrestamo() {
    setError('')
    const m = parseFloat(monto.replace(',', '.'))
    if (!(m > 0)) { setError('Monto inválido'); return }
    const t = parseFloat(tasa.replace(',', '.'))
    if (moneda === 'VES' && !(t > 0)) { setError('Para Bs ingresa la tasa del día'); return }
    setGuardando(true)
    const res = await crearPrestamo({
      empleadoId, empleadoNombre, monto: m, moneda,
      tasa: moneda === 'VES' ? t : null, motivo: motivo || null, fecha, registrarEgreso,
    })
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    setMonto(''); setTasa(''); setMotivo(''); setMoneda('USD'); setCreando(false)
    await recargar(); router.refresh()
  }

  async function guardarAbono(prestamoId: string) {
    setError('')
    const m = parseFloat(abMonto.replace(',', '.'))
    if (!(m > 0)) { setError('Monto de abono inválido'); return }
    setGuardando(true)
    const res = await abonarPrestamo({ prestamoId, empleadoId, monto: m, fecha: abFecha, nota: abNota || null })
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    setAbMonto(''); setAbNota(''); setAbonoDe(null)
    recargar()
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este préstamo y sus abonos? No borra el egreso ya generado.')) return
    await eliminarPrestamo(id, empleadoId)
    recargar()
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider flex items-center gap-2">
          <HandCoins size={15} className="text-oriental-red" /> Préstamos
          {prestamos.length > 0 && (
            <span className="text-[11px] font-semibold text-oriental-gray normal-case">· Saldo total ≈ ${saldoTotalUSD.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
          )}
        </h2>
        {!creando && (
          <button onClick={() => setCreando(true)} className="flex items-center gap-1.5 text-sm font-semibold text-oriental-red hover:underline">
            <Plus size={14} /> Nuevo préstamo
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3"><p className="text-xs text-red-800">{error}</p></div>}

      {creando && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto *</label>
              <div className="flex gap-1">
                <input className="input text-sm flex-1" type="text" inputMode="decimal" placeholder="0,00" value={monto} onChange={e => setMonto(e.target.value)} />
                {(['USD', 'VES'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMoneda(m)}
                    className={`px-2 rounded-lg text-xs font-semibold border ${moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input className="input text-sm" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            {moneda === 'VES' && (
              <div>
                <label className="label">Tasa Bs/$ *</label>
                <input className="input text-sm font-mono" type="text" inputMode="decimal" placeholder="Ej: 98,50" value={tasa} onChange={e => setTasa(e.target.value)} />
              </div>
            )}
            <div className={moneda === 'VES' ? '' : 'col-span-2'}>
              <label className="label">Motivo</label>
              <input className="input text-sm" placeholder="Opcional" value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-xs text-oriental-gray cursor-pointer">
            <input type="checkbox" checked={registrarEgreso} onChange={e => setRegistrarEgreso(e.target.checked)} />
            Registrar el egreso del desembolso (cuenta por cobrar)
          </label>
          <div className="flex gap-2 mt-3">
            <button onClick={guardarPrestamo} disabled={guardando} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs">
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Guardar
            </button>
            <button onClick={() => { setCreando(false); setError('') }} className="text-xs text-oriental-gray hover:text-oriental-black font-semibold px-2">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-oriental-gray py-4 text-center">Cargando…</p>
      ) : prestamos.length === 0 ? (
        <p className="text-sm text-oriental-gray py-4 text-center">Sin préstamos registrados.</p>
      ) : (
        <div className="space-y-3">
          {prestamos.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-oriental-black text-sm">
                    {fmt(p.monto, p.moneda)}
                    {p.saldo > 0
                      ? <span className="ml-2 text-[11px] font-bold text-oriental-red">Saldo {fmt(p.saldo, p.moneda)}</span>
                      : <span className="ml-2 text-[11px] font-bold text-green-700 inline-flex items-center gap-0.5"><CheckCircle2 size={11} /> Pagado</span>}
                  </p>
                  <p className="text-[11px] text-oriental-gray mt-0.5">{fmtFecha(p.fecha)}{p.motivo ? ` · ${p.motivo}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.saldo > 0 && (
                    <button onClick={() => { setAbonoDe(abonoDe === p.id ? null : p.id); setError('') }}
                      className="text-[11px] font-semibold text-oriental-red hover:underline px-2 py-1">Abonar</button>
                  )}
                  <button onClick={() => borrar(p.id)} className="p-1.5 rounded-lg text-oriental-gray hover:text-oriental-red hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>

              {p.abonos.length > 0 && (
                <div className="mt-2 pl-2 border-l-2 border-gray-100 space-y-0.5">
                  {p.abonos.map(a => (
                    <p key={a.id} className="text-[11px] text-oriental-gray">
                      {fmtFecha(a.fecha)} · abono {fmt(a.monto, p.moneda)}{a.nota ? ` — ${a.nota}` : ''}
                    </p>
                  ))}
                </div>
              )}

              {abonoDe === p.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 bg-gray-50/60 rounded-lg p-2">
                  <div>
                    <label className="label text-[10px]">Abono ({p.moneda})</label>
                    <input className="input text-sm w-28" type="text" inputMode="decimal" placeholder="0,00" value={abMonto} onChange={e => setAbMonto(e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-[10px]">Fecha</label>
                    <input className="input text-sm" type="date" value={abFecha} onChange={e => setAbFecha(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="label text-[10px]">Nota</label>
                    <input className="input text-sm" placeholder="Opcional" value={abNota} onChange={e => setAbNota(e.target.value)} />
                  </div>
                  <button onClick={() => guardarAbono(p.id)} disabled={guardando}
                    className="btn-primary py-2 px-3 text-xs flex items-center gap-1">
                    {guardando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Abonar
                  </button>
                  <button onClick={() => setAbonoDe(null)} className="p-2 text-oriental-gray hover:text-oriental-black"><X size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
