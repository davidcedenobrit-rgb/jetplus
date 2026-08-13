import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from './VehiculosFiltro'
import AC500Filtro from './AC500Filtro'
import PromoCotizar from './PromoCotizar'
import StickyNav from './StickyNav'
import RegistrarLead from './RegistrarLead'

const LOGO    = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const MG_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e64a9efded9c776ffb5.png'
const MX_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e646bac2400279a352f.png'
export const revalidate = 60

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const supabase = await createClient()
  // El branding (concesionarios) y las claves públicas de config tienen política
  // de lectura pública, así que se leen con el cliente anónimo. Esto asegura que
  // cada sede muestre SU marca/ciudad aunque el service key del deploy no esté
  // bien configurado (antes, si fallaba, el branding caía a Jetplus).
  const sp = await searchParams
  const evento = String(sp?.evento ?? '').slice(0, 80)

  const [{ data: catalogo }, { data: ac500 }, { data: promoVehiculos }, { data: promoData }, { data: tasasCfg }, { data: conc }] = await Promise.all([
    supabase.from('catalogo_ventas').select('*').eq('disponible', true).order('orden'),
    supabase.from('ac500_vehiculos').select('*').eq('disponible', true).order('orden'),
    supabase.from('promocion_vehiculos').select('*').order('orden').order('created_at'),
    supabase.from('promociones_especiales').select('*').limit(1).single(),
    supabase.from('config_cotizaciones').select('clave, valor').in('clave', ['tasa_bcv', 'tasa_usdt', 'wa_corporativo', 'concesionario_id']),
    supabase.from('concesionarios').select('id, nombre_comercial, ciudad, estado, logo_url, color_primario, color_secundario').eq('es_principal', true).limit(1).maybeSingle(),
  ])

  // valor puede venir como NUMERIC (número) desde la base; se normaliza a texto
  // para poder usar .replace()/Number() sin romper el render del link público.
  const cfg = (k: string) => {
    const v = (tasasCfg ?? []).find(t => t.clave === k)?.valor
    return v == null ? '' : String(v)
  }

  // Tasas para el diferencial cambiario del plan 100% Banco
  const tasas = {
    bcv:  Number(cfg('tasa_bcv')) || 0,
    usdt: Number(cfg('tasa_usdt')) || 0,
  }
  // WhatsApp corporativo (configurable por base; cae al número por defecto).
  const waCorp = cfg('wa_corporativo').replace(/\D/g, '') || '584248705174'
  const concesionario = cfg('concesionario_id') || conc?.id || ''

  // Branding del link de ventas, tomado del concesionario principal de la base
  // (Ki Auto en su base, Jetplus en la suya). Cae a los valores de Jetplus.
  const personalizado = !!(conc?.nombre_comercial || conc?.ciudad)
  const brand = {
    nombre: conc?.nombre_comercial || 'JETPLUS',
    ciudad: conc?.ciudad || 'Porlamar',
    estado: conc?.estado || 'Estado Nueva Esparta',
    wa: waCorp,
    // Marca personalizada → su logo (o ninguno); marca por defecto → logo de Jetplus.
    logo: conc?.logo_url || (personalizado ? '' : LOGO),
    // Colores del concesionario para el membrete de la imagen compartible
    // (rojo + negro de Jetplus por defecto; cada base puede sobreescribir).
    colorPrimario: conc?.color_primario || '#C41E3A',
    colorSecundario: conc?.color_secundario || '#111827',
  }

  // El logo se incrusta como data URI para el membrete de la imagen compartible:
  // html2canvas no puede exportar imágenes remotas sin CORS, así que al pasarlo
  // como base64 (mismo origen) el logo siempre aparece en la foto. Cae al URL si falla.
  async function logoDataUri(url: string): Promise<string> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return url
      const ct = res.headers.get('content-type') || 'image/png'
      const buf = Buffer.from(await res.arrayBuffer())
      return `data:${ct};base64,${buf.toString('base64')}`
    } catch { return url }
  }
  const logoImg = brand.logo ? await logoDataUri(brand.logo) : ''

  // Branding que reciben las cotizaciones rápidas para generar la imagen con membrete.
  const brandImg = {
    nombre: brand.nombre,
    logo: logoImg,
    colorPrimario: brand.colorPrimario,
    colorSecundario: brand.colorSecundario,
  }

  const lista = catalogo ?? []
  const acLista = (ac500 ?? []).filter(v => v.p6_activo || v.p9_activo || v.p12_activo)
  const promoActiva = promoData?.activa === true
  const promoVehiculosList = promoVehiculos ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 64 }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 32, objectFit: 'contain' }} />}
            {brand.logo && <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{brand.nombre}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>Link de vendedores · MG y MAXUS</p>
            </div>
          </div>
          {/* Brand pills + ubicación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="lo-brand-pill">
              <img src={MG_LOGO} alt="MG" style={{ height: 16, objectFit: 'contain' }} />
              <span style={{ width: 1, height: 14, background: '#e5e7eb' }} />
              <img src={MX_LOGO} alt="MAXUS" style={{ height: 16, objectFit: 'contain' }} />
            </div>
            <span className="lo-pill-loc" style={{ fontSize: 12 }}>📍 {brand.ciudad}, Venezuela</span>
          </div>
        </div>
      </div>

      {/* ── HERO (dos columnas) ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }} className="lo-hero-grid">
          {/* Columna izquierda */}
          <div className="lo-glass" style={{ padding: '32px 36px' }}>
            <span className="lo-pill-online" style={{ marginBottom: 18, display: 'inline-flex' }}>
              <span className="lo-dot" /> Herramienta de ventas · {brand.ciudad}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.1, color: '#111827', marginBottom: 14, letterSpacing: '-0.5px' }}>
              Link de <span style={{ color: '#a16207' }}>vendedores</span><br /><span style={{ color: '#a16207' }}>MG</span> y <span style={{ color: '#a16207' }}>MAXUS</span>
            </h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>
              Pasa cotizaciones rápidas y formales del Plan Asegúrate $500, vehículos de piso y promociones especiales. Registra a tus clientes y comparte todo desde aquí.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="#registro" className="lo-btn-gold">👤 Registrar cliente →</a>
              {acLista.length > 0 && <a href="#ac500" className="lo-btn-glass">🛡️ Plan $500 ↓</a>}
              {promoActiva && promoVehiculosList.length > 0 && <a href="#promociones" className="lo-btn-glass">🏷️ Promociones ↓</a>}
              <a href="#vehiculos" className="lo-btn-glass">Ver vehículos ↓</a>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 18 }}>* Precios referenciales. Las cotizaciones formales que generes llegan a la bandeja del director.</p>
          </div>

          {/* Columna derecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260, maxWidth: 300 }} className="lo-hero-right">
            {/* ¿Cómo funciona? */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 14 }}>¿Cómo funciona?</p>
              {[
                { icon: '👤', t: 'Registra al', b: 'cliente nuevo', d: 'con sus datos básicos.' },
                { icon: '⚡', t: 'Pasa una', b: 'cotización rápida', d: 'y compártela como imagen.' },
                { icon: '📄', t: 'Genera la', b: 'cotización formal', d: 'con tu código; llega a la bandeja del director.' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    {s.t} <strong style={{ color: '#111' }}>{s.b}</strong> {s.d}
                  </p>
                </div>
              ))}
            </div>

            {/* Sede (ciudad dinámica) */}
            <div style={{ background: '#fffbeb', border: '1px solid rgba(234,179,8,.3)', borderRadius: 14, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📍 Sede {brand.ciudad}</p>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                Atención personalizada en <strong>{brand.ciudad}, {brand.estado}</strong>. Cotizaciones aprobadas en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGISTRO DE CLIENTE / LEAD ────────────────────────────────────── */}
      <section id="registro" style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 20px 24px' }}>
        <RegistrarLead evento={evento} concesionario={concesionario} />
      </section>

      {/* ── VEHÍCULOS ─────────────────────────────────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 20px 56px' }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Sede {brand.ciudad} · Atención personalizada</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Vehículos MG &amp; MAXUS</h2>
        </div>
        <VehiculosFiltro vehiculos={lista} tasas={tasas} evento={evento} waCorp={waCorp} concesionario={concesionario} brand={brandImg} />
      </section>

      {/* ── AC500 ─────────────────────────────────────────────────────────── */}
      {acLista.length > 0 && (
        <section id="ac500" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🛡️ Plan exclusivo</span>
            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>
              Asegúrate con <span style={{ background: 'linear-gradient(135deg,#ca8a04,#a16207)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$500</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Reserva tu vehículo MG o MAXUS con solo $500 y accede a un precio preferencial hasta 30% por debajo del mercado. Completa el resto con un cronograma de cuotas y recíbelo en el mes 6.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['🛡️ Precio congelado', '📉 Hasta 30% menos', '📅 Cuotas programadas', '🚗 Entrega mes 6', '✅ Sin letra chica'].map(p => (
                <span key={p} className="lo-perk">{p}</span>
              ))}
            </div>
          </div>
          <AC500Filtro vehiculos={acLista} waCorp={waCorp} evento={evento} concesionario={concesionario} brand={brandImg} />
        </section>
      )}

      {/* ── PROMOCIONES ESPECIALES ────────────────────────────────────────── */}
      {promoActiva && promoVehiculosList.length > 0 && (
        <section id="promociones" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🏷️ Oferta especial</span>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>
              {promoData?.titulo ?? 'Promociones Especiales'}
            </h2>
            {promoData?.subtitulo && (
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{promoData.subtitulo}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {promoVehiculosList.map((v: {
              id: string; vehiculo_id: string | null; img_url: string | null; marca: string; modelo: string;
              precio_base: number; gastos_label: string; gastos_contado: number;
              mostrar_credito: boolean; gastos_credito: number; cuota_mensual: number;
            }) => {
              // Jetplus opera bajo el régimen de Puerto Libre de Margarita: exonerado de IVA.
              const iva = 0
              const totalContado = v.precio_base + iva + v.gastos_contado
              const ini40 = v.precio_base * 0.40
              const fin60 = v.precio_base * 0.60
              const totalInicial = ini40 + iva + v.gastos_credito
              const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(n)*100)%100===0?0:2, maximumFractionDigits: 2 })
              const tdH: CSSProperties = { padding: '7px 12px', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 800, color: '#fff', background: '#1a1a1a' }
              const tdL: CSSProperties = { padding: '6px 12px', fontFamily: 'sans-serif', fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' }
              const tdV: CSSProperties = { padding: '6px 12px', fontFamily: 'sans-serif', fontSize: 12, color: '#111827', fontWeight: 700, textAlign: 'right', borderBottom: '1px solid #e5e7eb' }
              const tdSH: CSSProperties = { padding: '7px 12px', fontFamily: 'sans-serif', fontSize: 12, fontWeight: 800, color: '#fff', background: '#ca8a04', textAlign: 'center' }
              const tdTotal: CSSProperties = { padding: '8px 12px', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 900, color: '#111827', background: '#fef9c3' }
              const tdTotalV: CSSProperties = { padding: '8px 12px', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 900, color: '#111827', background: '#fef9c3', textAlign: 'right' }
              return (
                <div key={v.id} style={{ border: '2px solid #1a1a1a', borderRadius: 8, overflow: 'hidden', width: '100%', maxWidth: 340, background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
                  {v.img_url && (
                    <div style={{ background: '#f9fafb', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                      <img src={v.img_url} alt={v.modelo} style={{ maxHeight: 108, maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr><td colSpan={2} style={tdH}>VEHÍCULO</td></tr>
                      <tr><td style={tdL}>MARCA:</td><td style={tdV}>{v.marca}</td></tr>
                      <tr><td style={tdL}>MODELO:</td><td style={tdV}>{v.modelo}</td></tr>
                      <tr><td colSpan={2} style={tdSH}>MODALIDAD DE CONTADO</td></tr>
                      <tr><td style={tdL}>100% PRECIO BASE:</td><td style={tdV}>${fmt(v.precio_base)}</td></tr>
                      <tr><td style={tdL}>I.V.A. (exonerado):</td><td style={tdV}>${fmt(iva)}</td></tr>
                      <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>${fmt(v.gastos_contado)}</td></tr>
                      <tr><td style={tdTotal}>TOTAL A PAGAR</td><td style={tdTotalV}>${fmt(totalContado)}</td></tr>
                      {v.mostrar_credito && (
                        <>
                          <tr><td colSpan={2} style={tdSH}>MODALIDAD CRÉDITO 24 MESES (40% INICIAL)</td></tr>
                          <tr><td style={tdL}>40% PRECIO BASE:</td><td style={tdV}>${fmt(ini40)}</td></tr>
                          <tr><td style={tdL}>I.V.A. (exonerado):</td><td style={tdV}>${fmt(iva)}</td></tr>
                          <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>${fmt(v.gastos_credito)}</td></tr>
                          <tr><td style={tdTotal}>TOTAL INICIAL A PAGAR</td><td style={tdTotalV}>${fmt(totalInicial)}</td></tr>
                          <tr><td style={tdL}>FINANCIAMIENTO 60%</td><td style={tdV}>${fmt(fin60)}</td></tr>
                          <tr><td style={tdTotal}>24 CUOTAS MENSUALES:</td><td style={tdTotalV}>${fmt(v.cuota_mensual)}</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>
                  <PromoCotizar
                    promo={{
                      id: v.id, vehiculo_id: v.vehiculo_id, marca: v.marca, modelo: v.modelo,
                      precio_base: v.precio_base, gastos_contado: v.gastos_contado,
                      gastos_credito: v.gastos_credito, cuota_mensual: v.cuota_mensual,
                    }}
                    tasas={tasas}
                    evento={evento} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '30px 16px', textAlign: 'center' }}>
        {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 22, objectFit: 'contain', filter: 'invert(1)', opacity: .4, marginBottom: 12 }} />}
        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, marginBottom: 4 }}>{brand.nombre} · Representantes oficiales MG &amp; MAXUS · Sede {brand.ciudad}</p>
        <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 11 }}>* Precios referenciales. Consulta disponibilidad con tu asesor.</p>
      </footer>

      {/* ── STICKY BOTTOM NAV ─────────────────────────────────────────────── */}
      <StickyNav hasAC500={acLista.length > 0} hasPromos={promoActiva && promoVehiculosList.length > 0} />
    </div>
  )
}
