'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Plus, Search, X, Loader2, Trash2, Check, BookMarked } from 'lucide-react'
import { METODOS_PAGO, BANCOS_VE } from '@/lib/utils'
import FileUpload from '@/components/FileUpload'
import { buscarClientesAnticipo, crearAnticipo, anularAnticipo, listarShowroomDisponible, type ClienteBusca, type ShowroomOpt } from './actions'

type Anticipo = {
  id: string
  cliente_id: string
  monto: number
  moneda: string
  monto_usd: number
  saldo_usd: number
  metodo_pago: string | null
  referencia: string | null
  fecha_pago: string
  concepto: string | null
  estado: string
  created_at: string
  reserva_vehiculo: { marca?: string; modelo?: string; placa?: string | null } | null
  clientes: { nombre: string; cedula_rif: string | null } | null
}

const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fFecha = (s: string | null) => {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d
}
const ESTADO_STYLE: Record<string, string> = {
  disponible: 'bg-green-100 text-green-700',
  parcial: 'bg-amber-100 text-amber-700',
  aplicado: 'bg-gray-100 text-gray-600',
  anulado: 'bg-red-100 text-red-600',
}
const hoy = () => new Date().toISOString().slice(0, 10)

export default function AnticiposClient({ anticiposIniciales }: { anticiposIniciales: Anticipo[] }) {
  const router = useRouter()
  const [anticipos, setAnticipos] = useState<Anticipo[]>(anticiposIniciales)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busq, setBusq] = useState('')

  // Formulario
  const [cliQuery, setCliQuery] = useState('')
  const [cliRes, setCliRes] = useState<ClienteBusca[]>([])
  const [cliSel, setCliSel] = useState<ClienteBusca | null>(null)
  const [moneda, setMoneda] = useState<'USD' | 'VES' | 'USDT'>('USD')
  const [monto, setMonto] = useState('')
  const [tasa, setTasa] = useState('')
  const [metodo, setMetodo] = useState('')
  const [bancoEmisor, setBancoEmisor] = useState('')
  const [bancoReceptor, setBancoReceptor] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [comprobantes, setComprobantes] = useState<{ url: string; nombre: string }[]>([])
  // Carro a reservar (opcional) — para generar el acuerdo de reserva.
  const [vehQuery, setVehQuery] = useState('')
  const [vehRes, setVehRes] = useState<ShowroomOpt[]>([])
  const [vehSel, setVehSel] = useState<ShowroomOpt | null>(null)

  useEffect(() => {
    if (!open) return
    const q = cliQuery.trim()
    if (cliSel && cliSel.nombre === q) return
    if (q.length < 2) { setCliRes([]); return }
    const t = setTimeout(() => { buscarClientesAnticipo(q).then(setCliRes).catch(() => setCliRes([])) }, 300)
    return () => clearTimeout(t)
  }, [cliQuery, open, cliSel])

  useEffect(() => {
    if (!open) return
    const q = vehQuery.trim()
    if (vehSel && `${vehSel.marca} ${vehSel.modelo}` === q) return
    const t = setTimeout(() => { listarShowroomDisponible(q).then(setVehRes).catch(() => setVehRes([])) }, 300)
    return () => clearTimeout(t)
  }, [vehQuery, open, vehSel])

  function resetForm() {
    setCliQuery(''); setCliRes([]); setCliSel(null); setMoneda('USD'); setMonto(''); setTasa('')
    setMetodo(''); setBancoEmisor(''); setBancoReceptor(''); setReferencia(''); setFecha(hoy()); setConcepto(''); setObservaciones(''); setComprobantes([]); setVehQuery(''); setVehRes([]); setVehSel(null); setError('')
  }
  function abrir() { resetForm(); setOpen(true) }

  const montoUsd = useMemo(() => {
    const m = parseFloat(monto.replace(',', '.')) || 0
    const t = parseFloat(tasa.replace(',', '.')) || 0
    return moneda === 'VES' ? (t > 0 ? Math.round((m / t) * 100) / 100 : 0) : m
  }, [monto, tasa, moneda])

  async function guardar() {
    if (!cliSel) { setError('Selecciona el cliente'); return }
    setSaving(true); setError('')
    const res = await crearAnticipo({
      clienteId: cliSel.id,
      monto: parseFloat(monto.replace(',', '.')) || 0,
      moneda,
      tasaCambio: moneda === 'VES' ? (parseFloat(tasa.replace(',', '.')) || 0) : null,
      metodoPago: metodo || null,
      bancoEmisor: bancoEmisor || null,
      bancoReceptor: bancoReceptor || null,
      referencia: referencia || null,
      fechaPago: fecha,
      concepto: concepto || null,
      observaciones: observaciones || null,
      comprobantes,
      reservaVehiculo: vehSel ? { marca: vehSel.marca, modelo: [vehSel.modelo, vehSel.version].filter(Boolean).join(' '), placa: vehSel.placa, color: vehSel.color, showroom_id: vehSel.id } : null,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setOpen(false)
    router.refresh()
    // Optimista: agregar arriba (se refresca con el server igual)
    setAnticipos(prev => [{
      id: res.anticipoId!, cliente_id: cliSel.id, monto: parseFloat(monto.replace(',', '.')) || 0, moneda,
      monto_usd: montoUsd, saldo_usd: montoUsd, metodo_pago: metodo || null, referencia: referencia || null,
      fecha_pago: fecha, concepto: concepto || null, estado: 'disponible', created_at: new Date().toISOString(),
      reserva_vehiculo: vehSel ? { marca: vehSel.marca, modelo: vehSel.modelo, placa: vehSel.placa } : null,
      clientes: { nombre: cliSel.nombre, cedula_rif: cliSel.cedula_rif },
    }, ...prev])
  }

  async function anular(a: Anticipo) {
    if (!confirm(`¿Anular el anticipo de ${a.clientes?.nombre ?? 'cliente'} por $${fmt(a.monto_usd)}?`)) return
    const res = await anularAnticipo(a.id)
    if (res.error) { alert(res.error); return }
    setAnticipos(prev => prev.map(x => x.id === a.id ? { ...x, estado: 'anulado', saldo_usd: 0 } : x))
  }

  const filtrados = useMemo(() => {
    const q = busq.trim().toLowerCase()
    if (!q) return anticipos
    return anticipos.filter(a =>
      (a.clientes?.nombre ?? '').toLowerCase().includes(q) ||
      (a.clientes?.cedula_rif ?? '').toLowerCase().includes(q) ||
      (a.referencia ?? '').toLowerCase().includes(q))
  }, [anticipos, busq])

  const totalDisponible = useMemo(() => anticipos.filter(a => a.estado !== 'anulado').reduce((s, a) => s + Number(a.saldo_usd || 0), 0), [anticipos])

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oriental-red'

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-oriental-red/10 flex items-center justify-center"><Wallet size={20} className="text-oriental-red" /></div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Anticipos</h1>
            <p className="text-oriental-gray text-sm">Abonos y pagos del cliente antes de la cotización o la venta. Saldo disponible: <b className="text-oriental-black">${fmt(totalDisponible)}</b></p>
          </div>
        </div>
        <button onClick={abrir} className="flex items-center gap-2 px-4 py-2.5 bg-oriental-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">
          <Plus size={16} /> Registrar anticipo
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar por cliente, cédula o referencia…" className={inp + ' pl-9'} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-oriental-gray border-b border-gray-100">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-right">Saldo (USD)</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-oriental-gray">No hay anticipos registrados.</td></tr>
            ) : filtrados.map(a => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-oriental-gray">{fFecha(a.fecha_pago)}</td>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-oriental-black">{a.clientes?.nombre ?? '—'}</p>
                  {a.clientes?.cedula_rif && <p className="text-[11px] text-oriental-gray">{a.clientes.cedula_rif}</p>}
                </td>
                <td className="px-4 py-2.5 text-oriental-gray">{a.metodo_pago ?? '—'}{a.referencia ? <span className="text-[11px]"> · {a.referencia}</span> : ''}</td>
                <td className="px-4 py-2.5 text-right font-mono">{a.moneda === 'VES' ? 'Bs ' : '$'}{fmt(a.monto)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-oriental-black">${fmt(a.saldo_usd)}</td>
                <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_STYLE[a.estado] ?? 'bg-gray-100 text-gray-600'}`}>{a.estado}</span></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {a.reserva_vehiculo?.modelo && (
                      <a href={`/api/anticipos/${a.id}/reserva/pdf`} target="_blank" rel="noopener noreferrer" title="Acuerdo de reserva del vehículo"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"><BookMarked size={13} /> Reserva</a>
                    )}
                    {a.estado === 'disponible' && (
                      <button onClick={() => anular(a)} title="Anular" className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal registrar */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-oriental-black text-base flex items-center gap-2"><Wallet size={16} className="text-oriental-red" /> Registrar anticipo</h2>
              <button onClick={() => !saving && setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-800">{error}</div>}

              {/* Cliente */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Cliente *</label>
                {cliSel ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <Check size={14} className="text-green-600" />
                    <span className="flex-1 text-sm text-oriental-black">{cliSel.nombre}{cliSel.cedula_rif ? ` · ${cliSel.cedula_rif}` : ''}</span>
                    <button onClick={() => { setCliSel(null); setCliQuery('') }} className="text-gray-400 hover:text-oriental-red"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input className={inp} value={cliQuery} onChange={e => setCliQuery(e.target.value)} placeholder="Buscar cliente por nombre o cédula…" />
                    {cliRes.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {cliRes.map(c => (
                          <button key={c.id} onClick={() => { setCliSel(c); setCliQuery(c.nombre); setCliRes([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-oriental-red/5">
                            <span className="font-medium text-oriental-black">{c.nombre}</span>
                            {c.cedula_rif && <span className="text-oriental-gray"> · {c.cedula_rif}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Moneda + monto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Moneda</label>
                  <select className={inp} value={moneda} onChange={e => setMoneda(e.target.value as 'USD' | 'VES' | 'USDT')}>
                    <option value="USD">Dólares $</option>
                    <option value="VES">Bolívares Bs</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Monto ({moneda === 'VES' ? 'Bs' : moneda}) *</label>
                  <input className={inp + ' text-right'} inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0,00" />
                </div>
              </div>
              {moneda === 'VES' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tasa del día (Bs/$) *</label>
                    <input className={inp + ' text-right'} inputMode="decimal" value={tasa} onChange={e => setTasa(e.target.value)} placeholder="0,00" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Equivale a (USD)</label>
                    <input className={inp + ' text-right bg-gray-50'} value={fmt(montoUsd)} readOnly />
                  </div>
                </div>
              )}

              {/* Método + fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Método de pago</label>
                  <select className={inp} value={metodo} onChange={e => setMetodo(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fecha del pago *</label>
                  <input type="date" className={inp} value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
              </div>

              {/* Bancos + referencia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Banco emisor</label>
                  <select className={inp} value={bancoEmisor} onChange={e => setBancoEmisor(e.target.value)}>
                    <option value="">—</option>
                    {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Banco receptor</label>
                  <select className={inp} value={bancoReceptor} onChange={e => setBancoReceptor(e.target.value)}>
                    <option value="">—</option>
                    {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">N° referencia</label>
                <input className={inp + ' font-mono'} value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="N° de referencia" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Concepto / observaciones</label>
                <input className={inp} value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej: abono para reservar el MG RX5" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Carro a reservar (opcional)</label>
                {vehSel ? (
                  <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                    <Check size={14} className="text-indigo-600" />
                    <span className="flex-1 text-sm text-oriental-black">{vehSel.marca} {vehSel.modelo}{vehSel.version ? ` ${vehSel.version}` : ''}{vehSel.placa ? ` · ${vehSel.placa}` : ''}{vehSel.color ? ` · ${vehSel.color}` : ''}</span>
                    <button onClick={() => { setVehSel(null); setVehQuery('') }} className="text-gray-400 hover:text-oriental-red"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input className={inp} value={vehQuery} onChange={e => setVehQuery(e.target.value)} placeholder="Buscar carro del showroom (marca, modelo o placa)…" />
                    {vehRes.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {vehRes.map(v => (
                          <button key={v.id} onClick={() => { setVehSel(v); setVehQuery(`${v.marca} ${v.modelo}`); setVehRes([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50">
                            <span className="font-medium text-oriental-black">{v.marca} {v.modelo}{v.version ? ` ${v.version}` : ''}</span>
                            <span className="text-oriental-gray">{v.placa ? ` · ${v.placa}` : ''}{v.color ? ` · ${v.color}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">Si eliges un carro, luego podrás generar el <b>Acuerdo de reserva</b> desde la lista.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Comprobante del pago</label>
                <FileUpload files={comprobantes} onFilesChange={setComprobantes} maxFiles={3} disabled={saving} />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-oriental-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Registrar anticipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
