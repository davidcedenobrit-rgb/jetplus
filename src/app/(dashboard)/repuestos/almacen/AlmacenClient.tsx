'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Send, Pencil, Trash2, History, X, Loader2, Upload,
  PackagePlus, PackageMinus, AlertTriangle, Boxes, CheckCircle2, Circle, ClipboardCheck,
} from 'lucide-react'
import type { AlmacenItem, AlmacenMovimiento } from './page'
import {
  registrarEntrada, transferirATaller, ajustarStock, editarItem, eliminarItem,
  cargaMasiva, verificarItem, desverificarItem, TALLERES, type TallerKey,
} from './actions'

const fmt = (n: number | null | undefined, dec = 2) =>
  Number(n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtFecha = (s: string) => {
  try { return new Date(s).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return s }
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const tallerLabel = (k: string | null) => TALLERES.find(t => t.key === k)?.label ?? k ?? '—'

const TIPO_LABEL: Record<string, { label: string; cls: string }> = {
  entrada: { label: 'Entrada', cls: 'bg-emerald-100 text-emerald-700' },
  transferencia: { label: 'Transferencia', cls: 'bg-indigo-100 text-indigo-700' },
  salida: { label: 'Salida', cls: 'bg-orange-100 text-orange-700' },
  ajuste: { label: 'Ajuste', cls: 'bg-gray-100 text-gray-600' },
  verificacion: { label: 'Verificación', cls: 'bg-teal-100 text-teal-700' },
}

export default function AlmacenClient({ items, movimientos }: { items: AlmacenItem[]; movimientos: AlmacenMovimiento[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | 'entrada' | 'carga' | 'bitacora'>(null)
  const [entradaItem, setEntradaItem] = useState<AlmacenItem | null>(null)     // sumar a existente
  const [transferir, setTransferir] = useState<AlmacenItem | null>(null)
  const [editar, setEditar] = useState<AlmacenItem | null>(null)
  const [bitacoraItem, setBitacoraItem] = useState<AlmacenItem | null>(null)
  // Verificación de inventario (chequeo físico durante la mudanza).
  const [verSet, setVerSet] = useState<Set<string>>(() => new Set(items.filter(i => i.verificado_at).map(i => i.id)))
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [verBusy, setVerBusy] = useState<Set<string>>(new Set())

  async function toggleVerificado(it: AlmacenItem) {
    if (verBusy.has(it.id)) return
    const estaVer = verSet.has(it.id)
    // Optimista: marca/desmarca al instante.
    setVerSet(prev => { const n = new Set(prev); estaVer ? n.delete(it.id) : n.add(it.id); return n })
    setVerBusy(prev => new Set(prev).add(it.id))
    const res = estaVer ? await desverificarItem(it.id) : await verificarItem({ itemId: it.id, cantidadActual: Number(it.cantidad) })
    setVerBusy(prev => { const n = new Set(prev); n.delete(it.id); return n })
    if (res.error) {
      // Revertir si falló.
      setVerSet(prev => { const n = new Set(prev); estaVer ? n.add(it.id) : n.delete(it.id); return n })
      alert(res.error)
    }
  }

  const filtrados = useMemo(() => {
    const nq = norm(q.trim())
    let base = items
    if (soloPendientes) base = base.filter(it => !verSet.has(it.id))
    if (!nq) return base
    return base.filter(it =>
      norm(it.descripcion).includes(nq) || norm(it.referencia ?? '').includes(nq) ||
      norm(it.marca ?? '').includes(nq) || norm(it.categoria ?? '').includes(nq) ||
      norm(it.ubicacion ?? '').includes(nq))
  }, [items, q, soloPendientes, verSet])

  const totales = useMemo(() => {
    let unidades = 0, valor = 0, bajo = 0
    for (const it of items) {
      unidades += Number(it.cantidad)
      valor += Number(it.cantidad) * Number(it.costo_unitario ?? 0)
      if (Number(it.stock_minimo) > 0 && Number(it.cantidad) <= Number(it.stock_minimo)) bajo++
    }
    return { refs: items.length, unidades, valor, bajo }
  }, [items])

  function refrescar() { router.refresh() }

  return (
    <div className="mt-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Stat icon={<Boxes size={16} />} label="Repuestos distintos" value={String(totales.refs)} tint="bg-teal-50 text-teal-700" />
        <Stat icon={<PackagePlus size={16} />} label="Unidades en stock" value={fmt(totales.unidades, 0)} tint="bg-emerald-50 text-emerald-700" />
        <Stat icon={<Boxes size={16} />} label="Valor del inventario" value={`$${fmt(totales.valor)}`} tint="bg-indigo-50 text-indigo-700" />
        <Stat icon={<AlertTriangle size={16} />} label="Bajo stock mínimo" value={String(totales.bajo)} tint="bg-amber-50 text-amber-700" />
        <Stat icon={<ClipboardCheck size={16} />} label="Verificados (chequeo)" value={`${verSet.size}/${totales.refs}`} tint="bg-green-50 text-green-700" />
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por descripción, referencia, marca, ubicación…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500" />
        </div>
        <button onClick={() => { setEntradaItem(null); setModal('entrada') }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
          <Plus size={15} /> Registrar entrada
        </button>
        <button onClick={() => setModal('carga')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 text-teal-700 hover:bg-teal-50 text-sm font-semibold">
          <Upload size={15} /> Carga masiva
        </button>
        <button onClick={() => setSoloPendientes(v => !v)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${soloPendientes ? 'bg-green-600 border-green-600 text-white' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
          title="Mostrar solo los repuestos que faltan por verificar">
          <ClipboardCheck size={15} /> {soloPendientes ? 'Viendo pendientes' : 'Solo pendientes'}
        </button>
        <button onClick={() => { setBitacoraItem(null); setModal('bitacora') }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold">
          <History size={15} /> Bitácora
        </button>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">
          {q ? 'No hay repuestos que coincidan.' : 'El almacén está vacío. Registra una entrada o usa la carga masiva para cargar el inventario.'}
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-center font-semibold px-2 py-2.5 w-10" title="Verificado en el chequeo">✓</th>
                <th className="text-left font-semibold px-3 py-2.5">Repuesto</th>
                <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Referencia</th>
                <th className="text-left font-semibold px-3 py-2.5 hidden lg:table-cell">Ubicación</th>
                <th className="text-right font-semibold px-3 py-2.5">Stock</th>
                <th className="text-right font-semibold px-3 py-2.5 hidden sm:table-cell">Costo u.</th>
                <th className="text-right font-semibold px-3 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(it => {
                const bajo = Number(it.stock_minimo) > 0 && Number(it.cantidad) <= Number(it.stock_minimo)
                const agotado = Number(it.cantidad) <= 0
                const verificado = verSet.has(it.id)
                const busy = verBusy.has(it.id)
                return (
                  <tr key={it.id} className={verificado ? 'bg-green-50/60 hover:bg-green-50' : 'hover:bg-gray-50/60'}>
                    <td className="px-2 py-2.5 text-center">
                      <button type="button" onClick={() => toggleVerificado(it)} disabled={busy}
                        title={verificado ? `Verificado${it.verificado_por ? ' por ' + it.verificado_por : ''} — clic para quitar` : 'Marcar como verificado en el chequeo'}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 disabled:opacity-40">
                        {busy ? <Loader2 size={16} className="animate-spin text-gray-400" />
                          : verificado ? <CheckCircle2 size={18} className="text-green-600" />
                          : <Circle size={18} className="text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-oriental-black">{it.descripcion}</p>
                      <p className="text-[11px] text-gray-400">
                        {[it.marca, it.categoria].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell font-mono text-xs text-gray-600">{it.referencia || '—'}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-gray-600">{it.ubicacion || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${agotado ? 'bg-red-100 text-red-700' : bajo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {fmt(it.cantidad, Number.isInteger(Number(it.cantidad)) ? 0 : 2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell text-xs text-gray-600">
                      {it.costo_unitario != null ? `${it.moneda === 'VES' ? 'Bs ' : '$'}${fmt(it.costo_unitario)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Entrada (sumar stock)" onClick={() => { setEntradaItem(it); setModal('entrada') }}
                          className="text-emerald-600 hover:bg-emerald-50"><PackagePlus size={15} /></IconBtn>
                        <IconBtn title="Transferir a taller" onClick={() => setTransferir(it)}
                          className="text-indigo-600 hover:bg-indigo-50" disabled={agotado}><Send size={14} /></IconBtn>
                        <IconBtn title="Editar" onClick={() => setEditar(it)}
                          className="text-gray-500 hover:bg-gray-100"><Pencil size={13} /></IconBtn>
                        <IconBtn title="Bitácora del repuesto" onClick={() => { setBitacoraItem(it); setModal('bitacora') }}
                          className="text-gray-500 hover:bg-gray-100"><History size={14} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'entrada' && (
        <EntradaModal item={entradaItem} onClose={() => setModal(null)} onDone={() => { setModal(null); refrescar() }} />
      )}
      {modal === 'carga' && (
        <CargaMasivaModal onClose={() => setModal(null)} onDone={() => { setModal(null); refrescar() }} />
      )}
      {modal === 'bitacora' && (
        <BitacoraModal movimientos={movimientos} items={items} item={bitacoraItem} onClose={() => setModal(null)} />
      )}
      {transferir && (
        <TransferirModal item={transferir} onClose={() => setTransferir(null)} onDone={() => { setTransferir(null); refrescar() }} />
      )}
      {editar && (
        <EditarModal item={editar} onClose={() => setEditar(null)} onDone={() => { setEditar(null); refrescar() }} />
      )}
    </div>
  )
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tint}`}>{icon}</div>
      <p className="text-lg font-bold text-oriental-black leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function IconBtn({ children, title, onClick, className = '', disabled }: { children: React.ReactNode; title: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  )
}

function Modal({ title, subtitle, icon, onClose, children, wide }: { title: string; subtitle?: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 max-h-[92vh] overflow-y-auto`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 text-white">{icon}</div>
            <div>
              <h2 className="font-bold text-oriental-black text-base">{title}</h2>
              {subtitle && <p className="text-xs text-oriental-gray mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={16} className="text-oriental-gray" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null
  return <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3"><p className="text-xs text-red-800">{msg}</p></div>
}

// ── Entrada: nuevo ítem o sumar a uno existente ─────────────────────
function EntradaModal({ item, onClose, onDone }: { item: AlmacenItem | null; onClose: () => void; onDone: () => void }) {
  const existente = !!item
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [referencia, setReferencia] = useState(item?.referencia ?? '')
  const [marca, setMarca] = useState(item?.marca ?? '')
  const [categoria, setCategoria] = useState(item?.categoria ?? '')
  const [ubicacion, setUbicacion] = useState(item?.ubicacion ?? '')
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState(item?.costo_unitario != null ? String(item.costo_unitario) : '')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>((item?.moneda as 'USD' | 'VES') ?? 'USD')
  const [stockMin, setStockMin] = useState(item?.stock_minimo ? String(item.stock_minimo) : '')
  const [refDoc, setRefDoc] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    const cant = parseFloat(cantidad.replace(',', '.'))
    if (isNaN(cant) || cant <= 0) { setError('Indica la cantidad que entra'); return }
    if (!existente && !descripcion.trim()) { setError('Indica la descripción del repuesto'); return }
    setLoading(true)
    const res = await registrarEntrada({
      itemId: item?.id ?? null,
      descripcion, referencia: referencia || null, marca: marca || null, categoria: categoria || null,
      ubicacion: ubicacion || null, cantidad: cant,
      costoUnitario: costo ? parseFloat(costo.replace(',', '.')) : null,
      moneda, stockMinimo: stockMin ? parseFloat(stockMin.replace(',', '.')) : null,
      referenciaDoc: refDoc || null, notas: notas || null,
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onDone()
  }

  return (
    <Modal icon={<PackagePlus size={18} />}
      title={existente ? 'Entrada de stock' : 'Nuevo repuesto en almacén'}
      subtitle={existente ? item!.descripcion : 'Registra un repuesto que entra al almacén (SORE, compra en plaza o carga manual).'}
      onClose={onClose}>
      <div className="space-y-3">
        {!existente && (
          <>
            <div>
              <label className="label">Descripción *</label>
              <input className="input text-sm" placeholder="Ej: Filtro de aceite MG5" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Referencia / código</label><input className="input text-sm" placeholder="Opcional" value={referencia} onChange={e => setReferencia(e.target.value)} /></div>
              <div><label className="label">Marca</label><input className="input text-sm" placeholder="MG / MAXUS" value={marca} onChange={e => setMarca(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Categoría</label><input className="input text-sm" placeholder="Opcional" value={categoria} onChange={e => setCategoria(e.target.value)} /></div>
              <div><label className="label">Ubicación</label><input className="input text-sm" placeholder="Estante / gaveta" value={ubicacion} onChange={e => setUbicacion(e.target.value)} /></div>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Cantidad que entra *</label><input className="input text-sm" type="text" inputMode="decimal" placeholder="0" value={cantidad} onChange={e => setCantidad(e.target.value)} /></div>
          <div>
            <label className="label">Costo unitario</label>
            <div className="flex gap-1">
              <input className="input text-sm flex-1" type="text" inputMode="decimal" placeholder="0,00" value={costo} onChange={e => setCosto(e.target.value)} />
              {(['USD', 'VES'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMoneda(m)}
                  className={`px-2 rounded-lg text-xs font-semibold border ${moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
              ))}
            </div>
          </div>
        </div>
        {existente && (
          <div><label className="label">Ubicación</label><input className="input text-sm" placeholder="Estante / gaveta" value={ubicacion} onChange={e => setUbicacion(e.target.value)} /></div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {!existente && <div><label className="label">Stock mínimo (alerta)</label><input className="input text-sm" type="text" inputMode="decimal" placeholder="0" value={stockMin} onChange={e => setStockMin(e.target.value)} /></div>}
          <div><label className="label">N° SORE / factura</label><input className="input text-sm" placeholder="Opcional" value={refDoc} onChange={e => setRefDoc(e.target.value)} /></div>
        </div>
        <div><label className="label">Notas</label><input className="input text-sm" placeholder="Opcional" value={notas} onChange={e => setNotas(e.target.value)} /></div>
      </div>
      <ErrorBox msg={error} />
      <div className="flex gap-2 pt-4">
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button onClick={guardar} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Guardando…' : 'Registrar entrada'}
        </button>
      </div>
    </Modal>
  )
}

// ── Transferir a taller ─────────────────────────────────────────────
function TransferirModal({ item, onClose, onDone }: { item: AlmacenItem; onClose: () => void; onDone: () => void }) {
  const [cantidad, setCantidad] = useState('')
  const [taller, setTaller] = useState<TallerKey>('la-oriental')
  const [motivo, setMotivo] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    const cant = parseFloat(cantidad.replace(',', '.'))
    if (isNaN(cant) || cant <= 0) { setError('Indica la cantidad a transferir'); return }
    if (cant > Number(item.cantidad)) { setError(`Solo hay ${fmt(item.cantidad, 0)} en stock`); return }
    setLoading(true)
    const res = await transferirATaller({ itemId: item.id, cantidad: cant, tallerDestino: taller, motivo: motivo || null, notas: notas || null })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onDone()
  }

  return (
    <Modal icon={<PackageMinus size={18} />} title="Transferir a taller" subtitle={item.descripcion} onClose={onClose}>
      <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-3 text-xs text-teal-800">
        Stock disponible: <strong>{fmt(item.cantidad, Number.isInteger(Number(item.cantidad)) ? 0 : 2)}</strong>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Taller destino *</label>
          <div className="grid grid-cols-1 gap-1.5">
            {TALLERES.map(t => (
              <button key={t.key} type="button" onClick={() => setTaller(t.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border text-left ${taller === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-oriental-gray border-gray-200 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div><label className="label">Cantidad a transferir *</label><input className="input text-sm" type="text" inputMode="decimal" placeholder="0" value={cantidad} onChange={e => setCantidad(e.target.value)} /></div>
        <div><label className="label">Motivo / orden de trabajo</label><input className="input text-sm" placeholder="Opcional (ej: OT-1234, reparación)" value={motivo} onChange={e => setMotivo(e.target.value)} /></div>
        <div><label className="label">Notas</label><input className="input text-sm" placeholder="Opcional" value={notas} onChange={e => setNotas(e.target.value)} /></div>
      </div>
      <ErrorBox msg={error} />
      <div className="flex gap-2 pt-4">
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button onClick={guardar} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Transfiriendo…' : 'Transferir'}
        </button>
      </div>
    </Modal>
  )
}

// ── Editar ítem + ajuste de stock ───────────────────────────────────
function EditarModal({ item, onClose, onDone }: { item: AlmacenItem; onClose: () => void; onDone: () => void }) {
  const [descripcion, setDescripcion] = useState(item.descripcion)
  const [referencia, setReferencia] = useState(item.referencia ?? '')
  const [marca, setMarca] = useState(item.marca ?? '')
  const [categoria, setCategoria] = useState(item.categoria ?? '')
  const [ubicacion, setUbicacion] = useState(item.ubicacion ?? '')
  const [costo, setCosto] = useState(item.costo_unitario != null ? String(item.costo_unitario) : '')
  const [moneda, setMoneda] = useState<'USD' | 'VES'>((item.moneda as 'USD' | 'VES') ?? 'USD')
  const [stockMin, setStockMin] = useState(item.stock_minimo ? String(item.stock_minimo) : '')
  const [notas, setNotas] = useState(item.notas ?? '')
  const [ajuste, setAjuste] = useState(String(item.cantidad))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    if (!descripcion.trim()) { setError('La descripción no puede quedar vacía'); return }
    setLoading(true)
    const res = await editarItem({
      itemId: item.id, descripcion, referencia: referencia || null, marca: marca || null,
      categoria: categoria || null, ubicacion: ubicacion || null,
      costoUnitario: costo ? parseFloat(costo.replace(',', '.')) : null, moneda,
      stockMinimo: stockMin ? parseFloat(stockMin.replace(',', '.')) : null, notas: notas || null,
    })
    if (res.error) { setLoading(false); setError(res.error); return }
    // Si cambió la cantidad, se registra un ajuste de conteo.
    const nueva = parseFloat(ajuste.replace(',', '.'))
    if (!isNaN(nueva) && nueva !== Number(item.cantidad)) {
      const aj = await ajustarStock({ itemId: item.id, nuevaCantidad: nueva })
      if (aj.error) { setLoading(false); setError(aj.error); return }
    }
    setLoading(false)
    onDone()
  }

  async function borrar() {
    if (!confirm(`¿Eliminar "${item.descripcion}" del almacén? Se conserva su bitácora.`)) return
    setLoading(true)
    const res = await eliminarItem(item.id)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onDone()
  }

  return (
    <Modal icon={<Pencil size={16} />} title="Editar repuesto" subtitle={item.descripcion} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Descripción *</label><input className="input text-sm" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Referencia / código</label><input className="input text-sm" value={referencia} onChange={e => setReferencia(e.target.value)} /></div>
          <div><label className="label">Marca</label><input className="input text-sm" value={marca} onChange={e => setMarca(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Categoría</label><input className="input text-sm" value={categoria} onChange={e => setCategoria(e.target.value)} /></div>
          <div><label className="label">Ubicación</label><input className="input text-sm" value={ubicacion} onChange={e => setUbicacion(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Costo unitario</label>
            <div className="flex gap-1">
              <input className="input text-sm flex-1" type="text" inputMode="decimal" value={costo} onChange={e => setCosto(e.target.value)} />
              {(['USD', 'VES'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMoneda(m)}
                  className={`px-2 rounded-lg text-xs font-semibold border ${moneda === m ? 'bg-oriental-black text-white border-oriental-black' : 'bg-white text-oriental-gray border-gray-200'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Stock mínimo</label><input className="input text-sm" type="text" inputMode="decimal" value={stockMin} onChange={e => setStockMin(e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Ajustar stock (conteo físico)</label>
          <input className="input text-sm font-mono" type="text" inputMode="decimal" value={ajuste} onChange={e => setAjuste(e.target.value)} />
          <p className="text-[11px] text-oriental-gray mt-1">Cambiar este número registra un ajuste en la bitácora.</p>
        </div>
        <div><label className="label">Notas</label><input className="input text-sm" value={notas} onChange={e => setNotas(e.target.value)} /></div>
      </div>
      <ErrorBox msg={error} />
      <div className="flex gap-2 pt-4">
        <button onClick={borrar} disabled={loading} title="Eliminar del almacén"
          className="px-3 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button>
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button onClick={guardar} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

// ── Carga masiva del inventario (pega desde Excel) ──────────────────
function CargaMasivaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cada línea: descripción[TAB o ;]cantidad[;]referencia[;]marca[;]ubicacion[;]costo
  const filas = useMemo(() => {
    return texto.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const c = l.split(/\t|;|\|/).map(s => s.trim())
      const cantidad = parseFloat((c[1] ?? '').replace(/\./g, '').replace(',', '.'))
      const costo = c[5] ? parseFloat(c[5].replace(/\./g, '').replace(',', '.')) : null
      return {
        descripcion: c[0] ?? '',
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        referencia: c[2] || null,
        marca: c[3] || null,
        ubicacion: c[4] || null,
        costoUnitario: costo != null && !isNaN(costo) ? costo : null,
      }
    }).filter(r => r.descripcion)
  }, [texto])

  async function cargar() {
    setError('')
    if (filas.length === 0) { setError('Pega al menos una fila con descripción'); return }
    setLoading(true)
    const res = await cargaMasiva(filas)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onDone()
  }

  return (
    <Modal icon={<Upload size={18} />} title="Carga masiva del inventario" wide
      subtitle="Pega el inventario desde Excel. Una fila por repuesto." onClose={onClose}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-800">
        Orden de columnas: <strong>Descripción · Cantidad · Referencia · Marca · Ubicación · Costo</strong>.
        Separadas por tabulación (pegar desde Excel), <code>;</code> o <code>|</code>. Solo la descripción y la cantidad son obligatorias.
      </div>
      <textarea className="textarea text-sm font-mono" rows={10}
        placeholder={'Filtro de aceite MG5\t12\tGFL-1234\tMG\tEstante A2\t3,50\nPastillas de freno MAXUS T60\t6\t\tMAXUS\tEstante B1\t18'}
        value={texto} onChange={e => setTexto(e.target.value)} />
      {filas.length > 0 && (
        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-500">Vista previa · {filas.length} repuesto{filas.length !== 1 ? 's' : ''}</div>
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
            {filas.slice(0, 30).map((f, i) => (
              <div key={i} className="px-3 py-1.5 text-xs flex justify-between gap-2">
                <span className="truncate">{f.descripcion} {f.referencia && <span className="text-gray-400 font-mono">· {f.referencia}</span>}</span>
                <span className="font-bold text-teal-700 shrink-0">{fmt(f.cantidad, 0)}{f.costoUnitario != null ? ` · $${fmt(f.costoUnitario)}` : ''}</span>
              </div>
            ))}
            {filas.length > 30 && <div className="px-3 py-1.5 text-[11px] text-gray-400">…y {filas.length - 30} más</div>}
          </div>
        </div>
      )}
      <ErrorBox msg={error} />
      <div className="flex gap-2 pt-4">
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button onClick={cargar} disabled={loading || filas.length === 0} className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Cargando…' : `Cargar ${filas.length || ''} repuesto${filas.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </Modal>
  )
}

// ── Bitácora de movimientos ─────────────────────────────────────────
function BitacoraModal({ movimientos, items, item, onClose }: { movimientos: AlmacenMovimiento[]; items: AlmacenItem[]; item: AlmacenItem | null; onClose: () => void }) {
  const nombrePorId = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) m.set(it.id, it.descripcion)
    return m
  }, [items])
  const filtrados = item ? movimientos.filter(m => m.item_id === item.id) : movimientos

  return (
    <Modal icon={<History size={18} />} title="Bitácora de movimientos" wide
      subtitle={item ? item.descripcion : 'Entradas, transferencias a taller y ajustes.'} onClose={onClose}>
      {filtrados.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Sin movimientos registrados.</p>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {filtrados.map(m => {
            const t = TIPO_LABEL[m.tipo] ?? { label: m.tipo, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div key={m.id} className="py-2.5 flex items-start gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${t.cls}`}>{t.label}</span>
                <div className="flex-1 min-w-0">
                  {!item && <p className="text-sm font-semibold text-oriental-black truncate">{m.item_id ? (nombrePorId.get(m.item_id) ?? '—') : '—'}</p>}
                  <p className="text-xs text-gray-600">
                    {m.tipo === 'transferencia' && <>→ {tallerLabel(m.taller_destino)} · </>}
                    <strong>{fmt(m.cantidad, Number.isInteger(Number(m.cantidad)) ? 0 : 2)}</strong> u.
                    {m.saldo_resultante != null && <span className="text-gray-400"> · saldo {fmt(m.saldo_resultante, 0)}</span>}
                    {m.referencia_doc && <span className="text-gray-400"> · {m.referencia_doc}</span>}
                  </p>
                  {(m.motivo || m.notas) && <p className="text-[11px] text-gray-400 truncate">{[m.motivo, m.notas].filter(Boolean).join(' · ')}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-gray-400">{fmtFecha(m.created_at)}</p>
                  {m.usuario_email && <p className="text-[10px] text-gray-300 truncate max-w-[120px]">{m.usuario_email}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex justify-end pt-4">
        <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-oriental-gray hover:bg-gray-50">Cerrar</button>
      </div>
    </Modal>
  )
}
