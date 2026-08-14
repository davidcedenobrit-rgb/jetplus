'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'jetplus_aliado_codigo'

interface Lead {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  vehiculo_interes: string | null
  tiene_inicial: boolean
  inicial_monto: number | null
  created_at: string
}

interface PanelData {
  aliado: { codigo: string; nombre: string; sector: string }
  leads: Lead[]
}

const SECTOR_LABEL: Record<string, string> = { inmobiliario: 'Sector inmobiliario', seguros: 'Sector seguros' }

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export default function PanelAliadoPage() {
  const [codigo, setCodigo] = useState<string | null>(null)
  const [data, setData] = useState<PanelData | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [buscar, setBuscar] = useState('')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    if (saved) cargar(saved)
  }, [])

  async function cargar(cod: string) {
    setCargando(true); setError('')
    try {
      const res = await fetch('/api/aliados/panel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: cod }),
      })
      if (!res.ok) {
        localStorage.removeItem(LS_KEY)
        setCodigo(null); setData(null)
        setError(res.status === 429 ? 'Demasiados intentos. Espera un momento.' : 'Código inválido o inactivo.')
        return
      }
      const json: PanelData = await res.json()
      setData(json); setCodigo(cod)
      localStorage.setItem(LS_KEY, cod)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const c = inputCodigo.trim().toUpperCase()
    if (!/^[A-Z]\d{3}$/.test(c)) { setError('Formato: 1 letra + 3 números (ej. A101).'); return }
    cargar(c)
  }

  function salir() {
    localStorage.removeItem(LS_KEY)
    setCodigo(null); setData(null); setInputCodigo('')
  }

  if (!codigo || !data) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="lo-glass" style={{ width: '100%', maxWidth: 380, padding: '32px 26px' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Mi panel de aliado</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Ingresa tu código</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            El mismo código con el que entras a /aliados. Vas a ver solo los clientes que tú has enviado.
          </p>
          <form onSubmit={onSubmit}>
            <input
              value={inputCodigo}
              onChange={e => setInputCodigo(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="A101"
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

  const q = buscar.trim().toLowerCase()
  const filtrados = q ? data.leads.filter(l => l.cliente_nombre.toLowerCase().includes(q)) : data.leads

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 90 }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px' }}>Mi panel · {SECTOR_LABEL[data.aliado.sector] ?? data.aliado.sector}</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{data.aliado.nombre}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/aliados" style={{ fontSize: 12.5, fontWeight: 700, color: '#a16207', background: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', textDecoration: 'none' }}>
                ← Volver
              </a>
              <button onClick={salir} style={{ fontSize: 12.5, fontWeight: 700, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}>
                Salir
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div className="lo-info-box">
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Clientes enviados</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{data.leads.length}</p>
            </div>
            <div className="lo-info-box">
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Con inicial disponible</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{data.leads.filter(l => l.tiene_inicial).length}</p>
            </div>
          </div>

          <input
            value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre…"
            style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #d1d5db', borderRadius: 12, marginBottom: 14, boxSizing: 'border-box' }}
          />

          {filtrados.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13.5 }}>
              {data.leads.length === 0 ? 'Todavía no has enviado clientes al concesionario.' : 'Sin resultados.'}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtrados.map(l => (
              <div key={l.id} className="lo-info-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>{l.cliente_nombre}</p>
                    <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{l.cliente_telefono}</p>
                    {l.vehiculo_interes && <p style={{ fontSize: 12.5, color: '#374151', marginTop: 2, fontWeight: 600 }}>{l.vehiculo_interes}</p>}
                    <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>{fmtFecha(l.created_at)}</p>
                  </div>
                  {l.tiene_inicial && (
                    <span className="lo-badge lo-badge-stock">
                      {l.inicial_monto ? `Inicial $${l.inicial_monto}` : 'Con inicial'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  )
}
