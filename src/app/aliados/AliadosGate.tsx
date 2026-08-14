'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import VehiculosFiltro, { type Vehiculo, type BrandImg } from '../ventas/VehiculosFiltro'
import AC500Filtro, { type AC500Vehiculo } from '../ventas/AC500Filtro'

const LS_KEY = 'jetplus_aliado_codigo'
const LS_NOMBRE = 'jetplus_aliado_nombre'

type Tab = 'catalogo' | 'ac500' | 'marca' | 'objeciones' | 'manual'

interface Brand { nombre: string; ciudad: string; estado: string; logo: string; colorPrimario: string; colorSecundario: string }

export default function AliadosGate({ vehiculos, ac500PL, ac500Nac, tasas, waCorp, concesionario, brand }: {
  vehiculos: Vehiculo[]
  ac500PL: AC500Vehiculo[]
  ac500Nac: AC500Vehiculo[]
  tasas: { bcv: number; usdt: number }
  waCorp: string
  concesionario: string
  brand: Brand
}) {
  const searchParams = useSearchParams()
  const [codigo, setCodigo] = useState<string | null>(null)
  const [nombre, setNombre] = useState<string>('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const enUrl = (searchParams.get('codigo') ?? '').trim().toUpperCase()
    if (/^[A-Z]\d{3}$/.test(enUrl)) { verificar(enUrl); return }
    const savedCod = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
    const savedNom = typeof window !== 'undefined' ? localStorage.getItem(LS_NOMBRE) : null
    if (savedCod && savedNom) { setCodigo(savedCod); setNombre(savedNom) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verificar(cod: string) {
    setCargando(true); setError('')
    try {
      const res = await fetch('/api/aliados/verificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: cod }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.valido) {
        setError('Código inválido o inactivo.')
        return
      }
      setCodigo(cod); setNombre(json.nombre)
      localStorage.setItem(LS_KEY, cod)
      localStorage.setItem(LS_NOMBRE, json.nombre)
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
    verificar(c)
  }

  function salir() {
    localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_NOMBRE)
    setCodigo(null); setNombre(''); setInputCodigo('')
  }

  if (!codigo) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="lo-glass" style={{ width: '100%', maxWidth: 380, padding: '32px 26px' }}>
          {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 30, objectFit: 'contain', marginBottom: 16 }} />}
          <p style={{ fontSize: 11, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>Aliados JETPLUS</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Ingresa tu código</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            El código personal que te entregó JETPLUS. Con él accedes al catálogo, al Plan Asegúrate $500 y a las herramientas de venta para tus clientes.
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

  const brandImg: BrandImg = { nombre: brand.nombre, logo: brand.logo, colorPrimario: brand.colorPrimario, colorSecundario: brand.colorSecundario }

  return (
    <AliadoContenido
      vehiculos={vehiculos} ac500PL={ac500PL} ac500Nac={ac500Nac} tasas={tasas}
      waCorp={waCorp} concesionario={concesionario} brand={brand} brandImg={brandImg}
      aliadoCodigo={codigo} aliadoNombre={nombre} salir={salir}
    />
  )
}

function AliadoContenido({ vehiculos, ac500PL, ac500Nac, tasas, waCorp, concesionario, brand, brandImg, aliadoCodigo, aliadoNombre, salir }: {
  vehiculos: Vehiculo[]
  ac500PL: AC500Vehiculo[]
  ac500Nac: AC500Vehiculo[]
  tasas: { bcv: number; usdt: number }
  waCorp: string
  concesionario: string
  brand: Brand
  brandImg: BrandImg
  aliadoCodigo: string
  aliadoNombre: string
  salir: () => void
}) {
  const [tab, setTab] = useState<Tab>('catalogo')
  const tieneAC500 = ac500PL.length > 0 || ac500Nac.length > 0

  const tabs: [Tab, string][] = [
    ['catalogo', 'Catálogo'],
    ...(tieneAC500 ? [['ac500', 'Plan $500'] as [Tab, string]] : []),
    ['marca', 'MG y MAXUS'],
    ['objeciones', 'Manejo de objeciones'],
    ['manual', 'Cómo funciona'],
  ]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 32, objectFit: 'contain' }} />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{brand.nombre}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>Panel de aliados · {aliadoNombre}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/aliados/panel" className="lo-cbtn-out" style={{ padding: '9px 16px', width: 'auto' }}>Mi panel</a>
            <button onClick={salir} style={{ fontSize: 12.5, fontWeight: 700, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 20px' }}>
        <div className="lo-glass" style={{ padding: '26px 30px' }}>
          <span className="lo-pill-online" style={{ marginBottom: 14, display: 'inline-flex' }}>
            <span className="lo-dot" /> Bienvenido, {aliadoNombre}
          </span>
          <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, lineHeight: 1.15, color: '#111827', marginBottom: 10 }}>
            Refiere clientes y envíalos directo al concesionario
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 640 }}>
            Muestra el catálogo y el Plan Asegúrate $500 a tu cliente. Cuando esté interesado, usa el botón <strong>"Enviar a concesionario"</strong> en la carta del vehículo: sus datos quedan en tu panel y JETPLUS recibe el contacto por WhatsApp al instante.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 24px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`lo-tab${tab === k ? ' on' : ''}`}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        {tab === 'catalogo' && (
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 18 }}>Vehículos MG &amp; MAXUS</h2>
            <VehiculosFiltro vehiculos={vehiculos} tasas={tasas} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
              modo="aliado" aliadoCodigo={aliadoCodigo} aliadoNombre={aliadoNombre} />
          </section>
        )}

        {tab === 'ac500' && tieneAC500 && (
          <section>
            {ac500PL.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 18 }}>AC500 · Puerto Libre</h2>
                <AC500Filtro vehiculos={ac500PL} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
                  modo="aliado" aliadoCodigo={aliadoCodigo} aliadoNombre={aliadoNombre} seccion="AC500 Puerto Libre" />
              </div>
            )}
            {ac500Nac.length > 0 && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 18 }}>AC500 · Nacionales</h2>
                <AC500Filtro vehiculos={ac500Nac} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
                  modo="aliado" aliadoCodigo={aliadoCodigo} aliadoNombre={aliadoNombre} seccion="AC500 Nacionales" />
              </div>
            )}
          </section>
        )}

        {tab === 'marca' && <ReseñaMarca />}
        {tab === 'objeciones' && <ManejoObjeciones />}
        {tab === 'manual' && <ManualUsuario />}
      </div>

      {/* ── STICKY BOTTOM NAV ─────────────────────────────────────────────── */}
      <AliadoStickyNav tab={tab} setTab={setTab} tieneAC500={tieneAC500} />
    </div>
  )
}

function AliadoStickyNav({ tab, setTab, tieneAC500 }: { tab: Tab; setTab: (t: Tab) => void; tieneAC500: boolean }) {
  function ir(t: Tab) {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const btnBase: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none',
    padding: '14px 6px', transition: 'opacity .15s', letterSpacing: '.2px', color: '#fff',
  }
  const activo = (t: Tab) => (tab === t ? { boxShadow: 'inset 0 -3px 0 rgba(255,255,255,.6)' } : {})
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, display: 'flex', boxShadow: '0 -2px 20px rgba(0,0,0,.18)' }}>
      <button onClick={() => ir('catalogo')} style={{ ...btnBase, background: '#111827', ...activo('catalogo') }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        🚗 Catálogo
      </button>
      {tieneAC500 && (
        <button onClick={() => ir('ac500')} style={{ ...btnBase, background: '#C41E3A', ...activo('ac500') }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          🛡️ Plan $500
        </button>
      )}
      <button onClick={() => ir('objeciones')} style={{ ...btnBase, background: '#a16207', ...activo('objeciones') }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        💬 Objeciones
      </button>
      <a href="/aliados/panel" style={{ ...btnBase, background: '#4338ca', textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        👤 Mi panel
      </a>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="lo-glass" style={{ padding: '28px 30px', marginBottom: 40 }}>{children}</div>
}

function ReseñaMarca() {
  return (
    <Panel>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 18 }}>Conoce las marcas MG y MAXUS</h2>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>MG</p>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          MG es una marca británica con casi un siglo de historia, hoy parte de SAIC Motor, uno de los grupos automotrices más grandes del mundo, con presencia en más de 100 países. Se distingue por un diseño moderno y deportivo, equipamiento de tecnología (pantallas táctiles, cámaras, sensores de seguridad) de serie en versiones donde otras marcas lo cobran aparte, y un respaldo industrial global que garantiza continuidad de repuestos y actualización constante de modelos.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>MAXUS</p>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          MAXUS, también del grupo SAIC, se especializa en vehículos utilitarios, pickups y SUV de gran capacidad: robustez, espacio y versatilidad para quienes necesitan un vehículo que rinda tanto en el trabajo como en familia.
        </p>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid rgba(234,179,8,.3)', borderRadius: 14, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>¿Por qué importa esto para tu cliente?</p>
        <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>
          En Venezuela, estos vehículos se comercializan bajo el régimen de Puerto Libre (Nueva Esparta), lo que significa un precio final más competitivo frente a marcas tradicionales, con equipamiento equivalente o superior. Esa es la puerta de entrada para hablarle a tu cliente de una alternativa real y bien respaldada.
        </p>
      </div>
    </Panel>
  )
}

const OBJECIONES = [
  {
    q: '"No conozco la marca, prefiero algo más tradicional (Toyota, Chevrolet...)"',
    r: 'MG y MAXUS pertenecen a SAIC Motor, uno de los mayores fabricantes de autos del mundo, con presencia en más de 100 países. No es una marca nueva ni improvisada: es una marca global con años de trayectoria que apenas se está posicionando fuerte en Venezuela, y eso mismo abre oportunidades de precio que las marcas ya establecidas no ofrecen.',
  },
  {
    q: '"¿Y si necesito repuestos o servicio técnico?"',
    r: 'JETPLUS es concesionario autorizado, con taller propio y repuestos originales. Ese respaldo directo con la marca es justamente lo que le da tranquilidad al cliente sobre mantenimiento a futuro. Cualquier duda puntual de garantía o servicio, tu asesor en JETPLUS se la confirma con el cliente directamente.',
  },
  {
    q: '"El precio me parece alto para una marca que no es tan conocida"',
    r: 'Al comparar equipamiento real (pantalla, cámara de retroceso, sensores, seguridad) MG y MAXUS suelen traer de serie lo que en otras marcas es un extra pagado aparte. Además, al operar bajo Puerto Libre, el precio ya viene exonerado de IVA — eso es lo que hace que la relación equipamiento/precio sea tan competitiva.',
  },
  {
    q: '"Lo voy a pensar, no estoy listo para comprar de contado"',
    r: 'Para eso existe el Plan Asegúrate $500: con solo $500 el cliente reserva su vehículo a un precio congelado (hasta 30% por debajo del mercado) y completa el resto con cuotas programadas, recibiendo el vehículo en unos meses. No es una decisión de todo o nada.',
  },
  {
    q: '"No tengo el dinero completo de contado"',
    r: 'Existen planes de financiamiento con 40% de inicial y cuotas mensuales, además del Plan Asegúrate $500 con cronograma de cuotas. Muéstrale al cliente la cotización rápida para que vea el número exacto de su cuota antes de comprometerse a nada.',
  },
  {
    q: '"¿Por qué comprar a través de ti y no directo?"',
    r: 'Tú le das acompañamiento cercano, resuelves sus dudas de una vez y le ahorras tiempo: el proceso lo maneja igual JETPLUS, pero el cliente no tiene que ir a buscar información por su cuenta. Es un servicio de valor agregado que tú le ofreces.',
  },
]

function ManejoObjeciones() {
  return (
    <Panel>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Manejo de objeciones</h2>
      <p style={{ fontSize: 13.5, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
        Las dudas más comunes que te va a plantear un cliente cuando le hables de MG o MAXUS, y cómo responderlas con seguridad.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {OBJECIONES.map((o, i) => (
          <div key={i} className="lo-info-box">
            <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{o.q}</p>
            <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.65 }}>{o.r}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const PASOS_MANUAL = [
  { t: 'Guarda tu acceso', d: 'Tu código es personal — es lo que identifica los clientes que refieres tú. Guarda el link y el código en un lugar donde los tengas a mano.' },
  { t: 'Explora el catálogo y el Plan $500', d: 'Usa las pestañas de arriba para mostrarle a tu cliente los vehículos disponibles y las cuotas del Plan Asegúrate $500.' },
  { t: 'Cotiza rápido si hace falta', d: 'El botón "Cotización rápida" te arma una imagen con el precio y las cuotas para enviarle a tu cliente al instante.' },
  { t: 'Envía al concesionario', d: 'Cuando el cliente esté decidido, presiona "Enviar a concesionario" en la carta del vehículo, completa su nombre, teléfono y si ya tiene una inicial disponible.' },
  { t: 'Se abre WhatsApp automáticamente', d: 'El mensaje llega ya armado con los datos del cliente — solo debes darle "Enviar" para que JETPLUS reciba el contacto de inmediato.' },
  { t: 'Consulta tu panel', d: 'En "Mi panel" puedes ver el historial completo de todos los clientes que has enviado, con fecha y estado.' },
  { t: 'Apóyate en las otras pestañas', d: 'Usa "MG y MAXUS" y "Manejo de objeciones" para resolver las dudas más comunes de tus clientes antes de enviarlos.' },
]

function ManualUsuario() {
  return (
    <Panel>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Cómo funciona esta herramienta</h2>
      <p style={{ fontSize: 13.5, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
        Una guía rápida para sacarle el máximo provecho a tu link de aliado.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {PASOS_MANUAL.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < PASOS_MANUAL.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>{p.t}</p>
              <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6 }}>{p.d}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
