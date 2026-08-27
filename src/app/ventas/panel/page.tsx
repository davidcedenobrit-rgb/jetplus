'use client'

import { useEffect, useState, useMemo } from 'react'

const LS_KEY = 'jetplus_vendedora_codigo'

interface VehiculoComprado { marca: string; modelo: string; fechaEntrega: string | null }

interface Cliente {
  id: string
  nombre: string
  cedula_rif: string
  tipo: string
  telefono: string | null
  whatsapp: string | null
  correo: string | null
  direccion: string | null
  ciudad: string | null
  activo: boolean
  created_at: string
  vehiculos: VehiculoComprado[]
  // Solo en vista de socio: quién(es) lo vendieron.
  trabajadoPor?: string[]
}

interface Lead {
  nombre: string
  telefono: string | null
  correo: string | null
  fuente: 'registrado' | 'cotizado' | 'registrado_cotizado'
  cotizaciones: number
  contexto: string | null
  fecha: string
  // Solo en vista de socio: a quién se le resolvió el campo `vendedor` (texto
  // libre) de la captación. null si es ambiguo o no coincide con nadie.
  vendedorResuelto?: { codigo: string; nombre: string } | null
}

interface Rapidito {
  id: string
  vendedora_codigo?: string
  vendedora_nombre?: string
  marca: string | null
  modelo: string | null
  precio_base: number | null
  cuota_mensual: number | null
  created_at: string
}

interface EquipoRow {
  codigo: string
  nombre: string
  rol: string
  leads: number
  rapiditos: number
  cotizaciones: number
  enviadas: number
  proformas: number
  conversionPct: number
}

interface Cotizacion {
  id: string
  numero: string
  fecha: string
  created_at: string
  estado: 'sin_respuesta' | 'aceptada' | 'rechazada' | 'pospuesta'
  marca: string
  modelo: string
  plan: string
  modalidad: string
  precio_base: number | null
  total_inicial: number | null
  costo_total: number | null
  cuota_mensual: number | null
  cliente_id: string | null
  cliente_nombre: string
  cliente_ci_rif: string
  cliente_correo: string | null
  cliente_telefono: string | null
  vendedoras: { codigo: string; nombre: string }[]
  compartidaCon: string[]
  // Solo en vista de socio: nombres de todos los que la trabajaron (incluida
  // la propia vendedora, a diferencia de compartidaCon que la excluye).
  trabajadaPor?: string[]
}

interface Proforma {
  id: string
  numero: string
  cotizacion_id: string
  fecha_emision: string
  monto_inicial: number | null
  saldo_pendiente: number | null
  created_at: string
}

interface PanelData {
  vendedora: { codigo: string; nombre: string; rol: 'vendedor' | 'socio' }
  leads: Lead[]
  clientes: Cliente[]
  cotizaciones: Cotizacion[]
  proformas: Proforma[]
  rapiditos: Rapidito[]
  // Solo en vista de socio:
  sede?: { codigo: string; nombre: string }[]
  equipo?: EquipoRow[]
}

const ESTADO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  sin_respuesta: { label: 'Sin respuesta', bg: '#f3f4f6', fg: '#374151' },
  aceptada: { label: 'Aceptada', bg: '#dcfce7', fg: '#15803d' },
  rechazada: { label: 'Rechazada', bg: '#fee2e2', fg: '#b91c1c' },
  pospuesta: { label: 'Pospuesta', bg: '#fef9c3', fg: '#92400e' },
}

const FUENTE_LEAD_LABEL: Record<Lead['fuente'], { label: string; bg: string; fg: string }> = {
  registrado: { label: 'Registrado', bg: '#dbeafe', fg: '#1d4ed8' },
  cotizado: { label: 'Cotizado', bg: '#fef9c3', fg: '#92400e' },
  registrado_cotizado: { label: 'Registrado + cotizado', bg: '#dcfce7', fg: '#15803d' },
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function primerNombre(nombre: string) {
  return (nombre || '').trim().split(/\s+/)[0] || nombre
}

// Normaliza un teléfono venezolano a formato internacional para wa.me (58...).
function limpiarNumero(num: string) {
  const solo = num.replace(/\D/g, '')
  if (solo.startsWith('58')) return solo
  if (solo.startsWith('0')) return '58' + solo.slice(1)
  return '58' + solo
}

function waLink(telefono: string, mensaje: string) {
  return `https://wa.me/${limpiarNumero(telefono)}?text=${encodeURIComponent(mensaje)}`
}

function mailtoLink(correo: string, asunto: string, cuerpo: string) {
  return `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}

type Periodo = '7d' | 'mes' | 'todo'
type Tab = 'resumen' | 'leads' | 'clientes' | 'cotizaciones' | 'rapiditos' | 'equipo'

export default function PanelVendedoraPage() {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [data, setData] = useState<PanelData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [tab, setTab] = useState<Tab>('resumen')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [buscarCliente, setBuscarCliente] = useState('')
  const [clienteAbiertoId, setClienteAbiertoId] = useState<string | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    if (saved) cargar(saved)
  }, [])

  async function cargar(cod: string) {
    setCargando(true); setError('')
    try {
      const res = await fetch('/api/vendedoras/panel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: cod }),
      })
      if (!res.ok) {
        localStorage.removeItem(LS_KEY)
        setCodigo(null); setData(null)
        setError(res.status === 429 ? 'Demasiados intentos. Espera un momento.' : 'Código inválido o inactivo.')
        return
      }
      const json: PanelData = await res.json()
      setData(json)
      setCodigo(cod)
      localStorage.setItem(LS_KEY, cod)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function onSubmitCodigo(e: React.FormEvent) {
    e.preventDefault()
    const c = inputCodigo.trim().toUpperCase()
    if (!/^[A-Z]\d{3}$/.test(c)) { setError('Formato: 1 letra + 3 números (ej. K101).'); return }
    cargar(c)
  }

  function salir() {
    localStorage.removeItem(LS_KEY)
    setCodigo(null); setData(null); setInputCodigo(''); setClienteAbiertoId(null); setTab('resumen')
  }

  // ── Pantalla de acceso ──────────────────────────────────────────────────
  if (!codigo || !data) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="lo-glass" style={{ width: '100%', maxWidth: 380, padding: '32px 26px' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Mi panel</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Ingresa tu código</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            El mismo código de 3 dígitos que usas para cotizar. Vas a ver solo tus leads y tus clientes.
          </p>
          <form onSubmit={onSubmitCodigo}>
            <input
              value={inputCodigo}
              onChange={e => setInputCodigo(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="K101"
              autoFocus
              inputMode="text"
              style={{ width: '100%', padding: '14px 16px', fontSize: 20, fontWeight: 800, letterSpacing: 3, textAlign: 'center', border: '1.5px solid #d1d5db', borderRadius: 12, marginBottom: 12, boxSizing: 'border-box' }}
            />
            {error && <p style={{ fontSize: 12.5, color: '#C41E3A', marginBottom: 12, fontWeight: 600 }}>{error}</p>}
            <button type="submit" disabled={cargando} className="lo-btn-gold" style={{ width: '100%', padding: '13px 0' }}>
              {cargando ? 'Verificando…' : 'Entrar →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <PanelScreen
      data={data} tab={tab} setTab={setTab} periodo={periodo} setPeriodo={setPeriodo}
      buscarCliente={buscarCliente} setBuscarCliente={setBuscarCliente}
      clienteAbiertoId={clienteAbiertoId} setClienteAbiertoId={setClienteAbiertoId}
      salir={salir}
    />
  )
}

function cutoffFecha(periodo: Periodo): Date | null {
  if (periodo === 'todo') return null
  const d = new Date()
  if (periodo === '7d') d.setDate(d.getDate() - 7)
  else { d.setDate(1); d.setHours(0, 0, 0, 0) } // mes en curso
  return d
}

function PanelScreen({
  data, tab, setTab, periodo, setPeriodo, buscarCliente, setBuscarCliente, clienteAbiertoId, setClienteAbiertoId, salir,
}: {
  data: PanelData
  tab: Tab; setTab: (t: Tab) => void
  periodo: Periodo; setPeriodo: (p: Periodo) => void
  buscarCliente: string; setBuscarCliente: (s: string) => void
  clienteAbiertoId: string | null; setClienteAbiertoId: (id: string | null) => void
  salir: () => void
}) {
  const esSocio = data.vendedora.rol === 'socio'
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const proformaIds = useMemo(() => new Set(data.proformas.map(p => p.cotizacion_id)), [data.proformas])

  const leadsFiltrados = useMemo(() => {
    if (!esSocio || !filtroVendedor) return data.leads
    return data.leads.filter(l => l.vendedorResuelto?.codigo === filtroVendedor)
  }, [data.leads, esSocio, filtroVendedor])

  const cotizacionesFiltradas = useMemo(() => {
    if (!esSocio || !filtroVendedor) return data.cotizaciones
    return data.cotizaciones.filter(c => (c.vendedoras ?? []).some(v => v.codigo === filtroVendedor))
  }, [data.cotizaciones, esSocio, filtroVendedor])

  const rapiditosFiltrados = useMemo(() => {
    if (!esSocio || !filtroVendedor) return data.rapiditos
    return data.rapiditos.filter(r => r.vendedora_codigo === filtroVendedor)
  }, [data.rapiditos, esSocio, filtroVendedor])

  const cotizacionesPeriodo = useMemo(() => {
    const cut = cutoffFecha(periodo)
    if (!cut) return data.cotizaciones
    return data.cotizaciones.filter(c => new Date(c.created_at) >= cut)
  }, [data.cotizaciones, periodo])

  const leadsPeriodo = useMemo(() => {
    const cut = cutoffFecha(periodo)
    if (!cut) return data.leads
    return data.leads.filter(l => new Date(l.fecha) >= cut)
  }, [data.leads, periodo])

  const clientesPeriodo = useMemo(() => {
    const cut = cutoffFecha(periodo)
    if (!cut) return data.clientes
    return data.clientes.filter(c => new Date(c.created_at) >= cut)
  }, [data.clientes, periodo])

  const metricas = useMemo(() => {
    const total = cotizacionesPeriodo.length
    const aceptadas = cotizacionesPeriodo.filter(c => c.estado === 'aceptada').length
    const conProforma = cotizacionesPeriodo.filter(c => proformaIds.has(c.id)).length
    const montoCotizado = cotizacionesPeriodo.reduce((s, c) => s + (Number(c.costo_total) || Number(c.total_inicial) || 0), 0)
    const totalEmbudo = leadsPeriodo.length + clientesPeriodo.length
    return {
      total, aceptadas, conProforma,
      leads: leadsPeriodo.length,
      clientesNuevos: clientesPeriodo.length,
      cierreVentas: totalEmbudo ? Math.round((clientesPeriodo.length / totalEmbudo) * 100) : 0,
      tasaConversion: total ? Math.round((conProforma / total) * 100) : 0,
      montoCotizado,
    }
  }, [cotizacionesPeriodo, leadsPeriodo, clientesPeriodo, proformaIds])

  const clienteAbierto = clienteAbiertoId ? data.clientes.find(c => c.id === clienteAbiertoId) ?? null : null

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>{esSocio ? 'Panel de socio' : 'Mi panel'}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{data.vendedora.nombre}</p>
          </div>
          <button onClick={salir} style={{ fontSize: 12.5, fontWeight: 700, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>

        {/* Aviso de vista de socio: para que no se lea como cartera propia */}
        {esSocio && (
          <div style={{ maxWidth: 640, margin: '0 auto 12px', padding: '0 18px' }}>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>👥</span>
              <p style={{ fontSize: 12, color: '#92400e', fontWeight: 700, margin: 0 }}>
                Estás viendo TODA la sede — no tu cartera individual.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 18px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {([
            ['resumen', 'Resumen'],
            ['leads', `Leads (${data.leads.length})`],
            ['clientes', `Clientes (${data.clientes.length})`],
            ['cotizaciones', 'Cotizaciones'],
            ['rapiditos', `Rapiditos (${data.rapiditos.length})`],
            ...(esSocio ? [['equipo', 'Equipo'] as [Tab, string]] : []),
          ] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setClienteAbiertoId(null) }} className={`f-btn${tab === k ? ' on' : ''}`} style={{ flex: '1 0 auto', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtro por vendedor: solo en vista de socio, sobre Leads/Cotizaciones/Rapiditos */}
        {esSocio && (tab === 'leads' || tab === 'cotizaciones' || tab === 'rapiditos') && (
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 18px 12px' }}>
            <select
              value={filtroVendedor}
              onChange={e => setFiltroVendedor(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #d1d5db', borderRadius: 10, background: '#fff', fontWeight: 700, color: '#374151' }}
            >
              <option value="">Toda la sede</option>
              {(data.sede ?? []).map(v => <option key={v.codigo} value={v.codigo}>{v.nombre} ({v.codigo})</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px' }}>
        {tab === 'resumen' && (
          <ResumenTab metricas={metricas} periodo={periodo} setPeriodo={setPeriodo} />
        )}
        {tab === 'leads' && (
          <LeadsTab leads={leadsFiltrados} vendedoraNombre={data.vendedora.nombre} mostrarVendedor={esSocio} />
        )}
        {tab === 'clientes' && !clienteAbierto && (
          <ClientesTab clientes={data.clientes} buscar={buscarCliente} setBuscar={setBuscarCliente} onAbrir={setClienteAbiertoId} mostrarVendedor={esSocio} />
        )}
        {tab === 'clientes' && clienteAbierto && (
          <FichaCliente cliente={clienteAbierto} cotizaciones={data.cotizaciones} proformaIds={proformaIds} vendedoraNombre={data.vendedora.nombre} onVolver={() => setClienteAbiertoId(null)} />
        )}
        {tab === 'cotizaciones' && (
          <CotizacionesTab cotizaciones={cotizacionesFiltradas} proformaIds={proformaIds} vendedoraNombre={data.vendedora.nombre} mostrarVendedor={esSocio} />
        )}
        {tab === 'rapiditos' && (
          <RapiditosTab rapiditos={rapiditosFiltrados} mostrarVendedor={esSocio} />
        )}
        {tab === 'equipo' && esSocio && (
          <EquipoTab equipo={data.equipo ?? []} />
        )}
      </div>
    </div>
  )
}

interface Metricas {
  total: number; aceptadas: number; conProforma: number
  leads: number; clientesNuevos: number; cierreVentas: number
  tasaConversion: number; montoCotizado: number
}

function ResumenTab({ metricas, periodo, setPeriodo }: { metricas: Metricas; periodo: Periodo; setPeriodo: (p: Periodo) => void }) {
  return (
    <div>
      <div className="plan-toggle" style={{ marginBottom: 18, width: '100%', display: 'flex' }}>
        {([['7d', 'Últimos 7 días'], ['mes', 'Este mes'], ['todo', 'Todo']] as [Periodo, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setPeriodo(k)} className={periodo === k ? 'active' : ''} style={{ flex: 1 }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MetricCard label="Cotizaciones hechas" valor={String(metricas.total)} />
        <MetricCard label="Leads" valor={String(metricas.leads)} />
        <MetricCard label="Clientes nuevos" valor={String(metricas.clientesNuevos)} />
        <MetricCard label="Cierre de ventas" valor={`${metricas.cierreVentas}%`} nota="clientes / (leads + clientes)" />
        <MetricCard label="Conversión a proforma" valor={`${metricas.tasaConversion}%`} nota="cotizaciones que llegaron a proforma" />
        <MetricCard label="Monto cotizado" valor={fmtMoney(metricas.montoCotizado)} />
      </div>
    </div>
  )
}
function MetricCard({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="lo-info-box">
      <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{valor}</p>
      {nota && <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>{nota}</p>}
    </div>
  )
}

function LeadsTab({ leads, vendedoraNombre, mostrarVendedor = false }: { leads: Lead[]; vendedoraNombre: string; mostrarVendedor?: boolean }) {
  const [buscar, setBuscar] = useState('')
  const q = buscar.trim().toLowerCase()
  const filtrados = q ? leads.filter(l => l.nombre.toLowerCase().includes(q)) : leads

  return (
    <div>
      <input
        value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre…"
        style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #d1d5db', borderRadius: 12, marginBottom: 14, boxSizing: 'border-box' }}
      />
      {filtrados.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>
          {leads.length === 0 ? 'Todavía no tienes leads (personas que aún no compran).' : 'Sin resultados.'}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtrados.map((l, i) => {
          const fuente = FUENTE_LEAD_LABEL[l.fuente]
          const tel = l.telefono
          const msg = `Hola ${primerNombre(l.nombre)}, te contacto de parte de JETPLUS (${vendedoraNombre}). ¿Cómo va tu interés en el ${l.contexto ?? 'vehículo MG o MAXUS'}? Cualquier duda, aquí estoy.`
          return (
            <div key={`${l.nombre}-${i}`} className="lo-info-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{l.nombre}</p>
                  {l.contexto && <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{l.contexto}</p>}
                  <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{fmtFecha(l.fecha)}{l.cotizaciones > 0 ? ` · ${l.cotizaciones} ${l.cotizaciones > 1 ? 'cotizaciones' : 'cotización'}` : ''}</p>
                  {mostrarVendedor && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: l.vendedorResuelto ? '#a16207' : '#9ca3af', marginTop: 2 }}>
                      {l.vendedorResuelto ? `Vendedor(a): ${l.vendedorResuelto.nombre}` : 'Sin vendedor(a) asignado'}
                    </p>
                  )}
                </div>
                <span style={{ background: fuente.bg, color: fuente.fg, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{fuente.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {tel ? (
                  <a href={waLink(tel, msg)} target="_blank" rel="noopener noreferrer" className="lo-cbtn-dark" style={{ flex: 1, background: '#22c55e', fontSize: 12.5, padding: '9px 10px' }}>
                    WhatsApp
                  </a>
                ) : (
                  <span className="lo-cbtn-out" style={{ flex: 1, fontSize: 12.5, padding: '9px 10px', opacity: .5, cursor: 'not-allowed' }}>WhatsApp</span>
                )}
                {l.correo && (
                  <a href={mailtoLink(l.correo, 'JETPLUS — Seguimiento', msg)} className="lo-cbtn-out" style={{ flex: 1, fontSize: 12.5, padding: '9px 10px' }}>
                    Correo
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ClientesTab({ clientes, buscar, setBuscar, onAbrir, mostrarVendedor = false }: { clientes: Cliente[]; buscar: string; setBuscar: (s: string) => void; onAbrir: (id: string) => void; mostrarVendedor?: boolean }) {
  const q = buscar.trim().toLowerCase()
  const filtrados = q
    ? clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.cedula_rif.toLowerCase().includes(q))
    : clientes

  return (
    <div>
      <input
        value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre o cédula…"
        style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #d1d5db', borderRadius: 12, marginBottom: 14, boxSizing: 'border-box' }}
      />
      {filtrados.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>
          {clientes.length === 0 ? 'Todavía no tienes clientes que hayan comprado.' : 'Sin resultados.'}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtrados.map(c => (
          <button key={c.id} onClick={() => onAbrir(c.id)} className="lo-info-box" style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid #ececec', background: '#fff' }}>
            <p style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{c.nombre}</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{c.cedula_rif}{c.telefono ? ` · ${c.telefono}` : ''}</p>
            {c.vehiculos.length > 0 && (
              <p style={{ fontSize: 11.5, color: '#15803d', marginTop: 4, fontWeight: 700 }}>
                {c.vehiculos.map(v => `${v.marca} ${v.modelo}`).join(', ')}
              </p>
            )}
            {mostrarVendedor && c.trabajadoPor && c.trabajadoPor.length > 0 && (
              <p style={{ fontSize: 11, fontWeight: 700, color: '#a16207', marginTop: 4 }}>
                Vendido por: {c.trabajadoPor.join(', ')}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function FichaCliente({ cliente, cotizaciones, proformaIds, vendedoraNombre, onVolver }: {
  cliente: Cliente; cotizaciones: Cotizacion[]; proformaIds: Set<string>; vendedoraNombre: string; onVolver: () => void
}) {
  const historico = cotizaciones.filter(c => c.cliente_id === cliente.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const tel = cliente.whatsapp || cliente.telefono
  const msg = `Hola ${primerNombre(cliente.nombre)}, te contacto de parte de JETPLUS (${vendedoraNombre}). ¿Cómo va todo? Cualquier cosa que necesites sobre tu vehículo MG o MAXUS, aquí estoy.`

  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: '#a16207', fontWeight: 700, fontSize: 13, marginBottom: 14, cursor: 'pointer', padding: 0 }}>
        ← Volver a mis clientes
      </button>

      <div className="lo-info-box" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 6 }}>{cliente.nombre}</p>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          {cliente.tipo === 'juridico' ? 'RIF' : 'Cédula'}: {cliente.cedula_rif}<br />
          {cliente.telefono && <>Teléfono: {cliente.telefono}<br /></>}
          {cliente.correo && <>Correo: {cliente.correo}<br /></>}
          {cliente.direccion && <>Dirección: {cliente.direccion}<br /></>}
          {cliente.ciudad && <>Ciudad: {cliente.ciudad}</>}
        </p>

        {cliente.vehiculos.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Vehículo(s) comprado(s)</p>
            {cliente.vehiculos.map((v, i) => (
              <p key={i} style={{ fontSize: 13, color: '#374151' }}>{v.marca} {v.modelo}{v.fechaEntrega ? ` — entregado ${fmtFecha(v.fechaEntrega)}` : ''}</p>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {tel ? (
            <a href={waLink(tel, msg)} target="_blank" rel="noopener noreferrer" className="lo-cbtn-dark" style={{ background: '#22c55e', flex: 1 }}>
              WhatsApp
            </a>
          ) : (
            <span className="lo-cbtn-out" style={{ flex: 1, opacity: .5, cursor: 'not-allowed' }}>WhatsApp</span>
          )}
          {cliente.correo && (
            <a href={mailtoLink(cliente.correo, 'JETPLUS — Seguimiento', msg)} className="lo-cbtn-out" style={{ flex: 1 }}>
              Correo
            </a>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
        Histórico ({historico.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {historico.map(c => <CotizacionRow key={c.id} c={c} tieneProforma={proformaIds.has(c.id)} compacta />)}
        {historico.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin cotizaciones todavía.</p>}
      </div>
    </div>
  )
}

function CotizacionesTab({ cotizaciones, proformaIds, vendedoraNombre, mostrarVendedor = false }: { cotizaciones: Cotizacion[]; proformaIds: Set<string>; vendedoraNombre: string; mostrarVendedor?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cotizaciones.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>Todavía no has hecho cotizaciones.</p>}
      {cotizaciones.map(c => <CotizacionRow key={c.id} c={c} tieneProforma={proformaIds.has(c.id)} vendedoraNombre={vendedoraNombre} mostrarVendedor={mostrarVendedor} />)}
    </div>
  )
}

function CotizacionRow({ c, tieneProforma, compacta = false, vendedoraNombre = '', mostrarVendedor = false }: { c: Cotizacion; tieneProforma: boolean; compacta?: boolean; vendedoraNombre?: string; mostrarVendedor?: boolean }) {
  const est = ESTADO_LABEL[c.estado] ?? ESTADO_LABEL.sin_respuesta
  const tel = c.cliente_telefono
  const msg = `Hola ${primerNombre(c.cliente_nombre)}, te contacto de parte de JETPLUS sobre tu cotización N° ${c.numero} (${c.marca} ${c.modelo}). ¿Tienes alguna duda o quieres que avancemos?`

  return (
    <div className="lo-info-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          {!compacta && <p style={{ fontSize: 13.5, fontWeight: 800, color: '#111827' }}>{c.cliente_nombre}</p>}
          <p style={{ fontSize: compacta ? 13.5 : 12.5, fontWeight: compacta ? 800 : 600, color: compacta ? '#111827' : '#6b7280' }}>{c.marca} {c.modelo}</p>
          <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>N° {c.numero} · {fmtFecha(c.fecha)}</p>
        </div>
        <span style={{ background: est.bg, color: est.fg, fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{est.label}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        <span className="lo-badge lo-badge-meta">{fmtMoney(c.total_inicial ?? c.costo_total)}</span>
        {tieneProforma && <span className="lo-badge lo-badge-stock">Pasó a proforma</span>}
        {!mostrarVendedor && c.compartidaCon?.length > 0 && <span className="lo-badge lo-badge-meta">Compartida con {c.compartidaCon.join(', ')}</span>}
        {mostrarVendedor && c.trabajadaPor && c.trabajadaPor.length > 0 && <span className="lo-badge lo-badge-meta">Vendedor(a): {c.trabajadaPor.join(', ')}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a href={`/api/cotizaciones/${c.id}/pdf`} target="_blank" rel="noopener noreferrer" className="lo-cbtn-out" style={{ flex: 1, fontSize: 12.5, padding: '9px 10px' }}>
          Ver PDF
        </a>
        {tel && (
          <a href={waLink(tel, msg)} target="_blank" rel="noopener noreferrer" className="lo-cbtn-dark" style={{ flex: 1, background: '#22c55e', fontSize: 12.5, padding: '9px 10px' }}>
            WhatsApp
          </a>
        )}
        {c.cliente_correo && (
          <a href={mailtoLink(c.cliente_correo, `JETPLUS — Cotización ${c.numero}`, msg)} className="lo-cbtn-out" style={{ flex: 1, fontSize: 12.5, padding: '9px 10px' }}>
            Correo
          </a>
        )}
      </div>
    </div>
  )
}

function RapiditosTab({ rapiditos, mostrarVendedor = false }: { rapiditos: Rapidito[]; mostrarVendedor?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rapiditos.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>
          Todavía no hay rapiditos generados.
        </p>
      )}
      {rapiditos.map(r => (
        <div key={r.id} className="lo-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{[r.marca, r.modelo].filter(Boolean).join(' ') || 'Vehículo'}</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{fmtFecha(r.created_at)}</p>
              {mostrarVendedor && r.vendedora_nombre && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#a16207', marginTop: 2 }}>Vendedor(a): {r.vendedora_nombre}</p>
              )}
            </div>
            {r.precio_base != null && (
              <span className="lo-badge lo-badge-meta">{fmtMoney(r.precio_base)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EquipoTab({ equipo }: { equipo: EquipoRow[] }) {
  const ordenado = [...equipo].sort((a, b) => b.cotizaciones - a.cotizaciones)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ordenado.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>Sin datos del equipo todavía.</p>
      )}
      {ordenado.map(v => (
        <div key={v.codigo} className="lo-info-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{v.nombre}</p>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#a16207', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>{v.codigo}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
            <MiniStat label="Leads" valor={v.leads} />
            <MiniStat label="Rapiditos" valor={v.rapiditos} />
            <MiniStat label="Cotiz." valor={v.cotizaciones} />
            <MiniStat label="Enviadas" valor={v.enviadas} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{v.proformas} proforma{v.proformas !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: v.conversionPct > 0 ? '#15803d' : '#9ca3af' }}>{v.conversionPct}% conversión</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{valor}</p>
      <p style={{ fontSize: 9.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</p>
    </div>
  )
}
