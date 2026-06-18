import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from './VehiculosFiltro'
import AC500Filtro from './AC500Filtro'
import StickyNav from './StickyNav'

const LOGO    = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const MG_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e64a9efded9c776ffb5.png'
const MX_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e646bac2400279a352f.png'
const WA_BASE = 'https://wa.me/584149989010'
const WA_MSG  = encodeURIComponent('Hola 👋 Vengo de la página de La Oriental y quiero información sobre los planes de compra.')
const WA_FIN  = encodeURIComponent('Hola 👋 Vengo de la web y quiero información sobre el plan de financiamiento 40% inicial + 24 cuotas.')

export const revalidate = 60

export default async function VentasPage() {
  const supabase = await createClient()

  const [{ data: catalogo }, { data: ac500 }, { data: promoVehiculos }, { data: promoData }] = await Promise.all([
    supabase.from('catalogo_ventas').select('*').eq('disponible', true).order('orden'),
    supabase.from('ac500_vehiculos').select('*').eq('disponible', true).order('orden'),
    supabase.from('promocion_vehiculos').select('*').order('orden').order('created_at'),
    supabase.from('promociones_especiales').select('*').limit(1).single(),
  ])

  const lista = catalogo ?? []
  const acLista = (ac500 ?? []).filter(v => v.p6_activo || v.p9_activo)
  const promoActiva = promoData?.activa === true
  const promoVehiculosList = promoVehiculos ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 64 }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={LOGO} alt="La Oriental" style={{ height: 32, objectFit: 'contain' }} />
            <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>La Oriental Automotors</p>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>Representantes oficiales · MG y MAXUS</p>
            </div>
          </div>
          {/* Brand pills + ubicación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="lo-brand-pill">
              <img src={MG_LOGO} alt="MG" style={{ height: 16, objectFit: 'contain' }} />
              <span style={{ width: 1, height: 14, background: '#e5e7eb' }} />
              <img src={MX_LOGO} alt="MAXUS" style={{ height: 16, objectFit: 'contain' }} />
            </div>
            <span className="lo-pill-loc" style={{ fontSize: 12 }}>📍 Maturín, Venezuela</span>
          </div>
        </div>
      </div>

      {/* ── HERO (dos columnas) ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }} className="lo-hero-grid">
          {/* Columna izquierda */}
          <div className="lo-glass" style={{ padding: '32px 36px' }}>
            <span className="lo-pill-online" style={{ marginBottom: 18, display: 'inline-flex' }}>
              <span className="lo-dot" /> Asesores disponibles · Atención en Maturín
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.1, color: '#111827', marginBottom: 14, letterSpacing: '-0.5px' }}>
              Tu próximo vehículo <span style={{ color: '#a16207' }}>MG</span><br />o <span style={{ color: '#a16207' }}>MAXUS</span> está aquí.
            </h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>
              Explora precios base y planes de financiamiento disponibles en nuestra sede de <strong style={{ color: '#374151' }}>Maturín</strong>. Nuestros asesores te acompañan en cada paso.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {promoActiva && promoVehiculosList.length > 0 && <a href="#promociones" className="lo-btn-gold">🏷️ Promociones →</a>}
              {acLista.length > 0 && <a href="#ac500" className="lo-btn-gold">🛡️ Plan $500 →</a>}
              <a href="#vehiculos" className="lo-btn-glass">Ver vehículos ↓</a>
              <a href={`${WA_BASE}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="lo-btn-wa">WhatsApp</a>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 18 }}>* Los precios mostrados son referenciales y pueden variar. Consulta disponibilidad con tu asesor.</p>
          </div>

          {/* Columna derecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260, maxWidth: 300 }} className="lo-hero-right">
            {/* ¿Cómo funciona? */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 14 }}>¿Cómo funciona?</p>
              {[
                { icon: '🔍', t: 'Revisa los', b: 'precios base y planes', d: 'disponibles en esta página.' },
                { icon: '💬', t: 'Contacta a un', b: 'asesor por WhatsApp', d: 'para confirmar disponibilidad.' },
                { icon: '📄', t: 'Tu asesor genera la', b: 'cotización formal', d: 'desde el catálogo.' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    {s.t} <strong style={{ color: '#111' }}>{s.b}</strong> {s.d}
                  </p>
                </div>
              ))}
            </div>

            {/* Sede Maturín */}
            <div style={{ background: '#fffbeb', border: '1px solid rgba(234,179,8,.3)', borderRadius: 14, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>📍 Sede Maturín</p>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                Atención personalizada en <strong>Maturín, Estado Monagas</strong>. Cotizaciones aprobadas en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROMOCIONES ESPECIALES ────────────────────────────────────────── */}
      {promoActiva && promoVehiculosList.length > 0 && (
        <section id="promociones" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🏷️ Oferta especial</span>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, color: '#111827', marginBottom: 10, lineHeight: 1.2 }}>
              {promoData?.titulo ?? 'Promociones Especiales'}
            </h2>
            {promoData?.subtitulo && (
              <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{promoData.subtitulo}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {promoVehiculosList.map((v: {
              id: string; img_url: string | null; marca: string; modelo: string;
              precio_base: number; gastos_label: string; gastos_contado: number;
              mostrar_credito: boolean; gastos_credito: number; cuota_mensual: number;
            }) => {
              const iva = v.precio_base * 0.16
              const totalContado = v.precio_base + iva + v.gastos_contado
              const ini40 = v.precio_base * 0.40
              const fin60 = v.precio_base * 0.60
              const totalInicial = ini40 + iva + v.gastos_credito
              const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                      <tr><td style={tdL}>I.V.A. (16%):</td><td style={tdV}>${fmt(iva)}</td></tr>
                      <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>${fmt(v.gastos_contado)}</td></tr>
                      <tr><td style={tdTotal}>TOTAL A PAGAR</td><td style={tdTotalV}>${fmt(totalContado)}</td></tr>
                      {v.mostrar_credito && (
                        <>
                          <tr><td colSpan={2} style={tdSH}>MODALIDAD CRÉDITO 24 MESES (40% INICIAL)</td></tr>
                          <tr><td style={tdL}>40% PRECIO BASE:</td><td style={tdV}>${fmt(ini40)}</td></tr>
                          <tr><td style={tdL}>I.V.A. (16%):</td><td style={tdV}>${fmt(iva)}</td></tr>
                          <tr><td style={tdL}>{v.gastos_label}</td><td style={tdV}>${fmt(v.gastos_credito)}</td></tr>
                          <tr><td style={tdTotal}>TOTAL INICIAL A PAGAR</td><td style={tdTotalV}>${fmt(totalInicial)}</td></tr>
                          <tr><td style={tdL}>FINANCIAMIENTO 60%</td><td style={tdV}>${fmt(fin60)}</td></tr>
                          <tr><td style={tdTotal}>24 CUOTAS MENSUALES:</td><td style={tdTotalV}>${fmt(v.cuota_mensual)}</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── VEHÍCULOS ─────────────────────────────────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 20px 56px' }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>Sede Maturín · Atención personalizada</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>Vehículos MG &amp; MAXUS</h2>
        </div>
        <VehiculosFiltro vehiculos={lista} />
      </section>

      {/* ── PLAN 40% ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #ececec', borderBottom: '1px solid #ececec', padding: '60px 16px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>📈 Financiamiento directo</span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#111827', marginBottom: 14, lineHeight: 1.2 }}>
            Estrena con <span style={{ color: '#a16207' }}>40% de inicial</span> y 24 cuotas fijas
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Sin bancos, sin trámites eternos. Financiamiento directo con La Oriental Automotors.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, maxWidth: 660, margin: '0 auto 32px' }}>
            {[
              { n: '01', icon: '🚗', t: 'Elige tu modelo', d: 'SUVs, sedanes, pickups — el que se adapte a tu estilo.' },
              { n: '02', icon: '💰', t: 'Entrega el 40% de inicial', d: 'El 60% restante en cuotas mensuales fijas.' },
              { n: '03', icon: '🔑', t: 'Sal manejando ese día', d: 'Al entregar la inicial, te llevas tu vehículo.' },
            ].map(s => (
              <div key={s.n} className="lo-info-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ca8a04', letterSpacing: '.5px' }}>{s.n}</span>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 5 }}>{s.t}</p>
                <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <a href={`${WA_BASE}?text=${WA_FIN}`} target="_blank" rel="noopener noreferrer" className="lo-btn-wa">Consultar plan de financiamiento</a>
        </div>
      </section>

      {/* ── AC500 ─────────────────────────────────────────────────────────── */}
      {acLista.length > 0 && (
        <section id="ac500" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🛡️ Plan exclusivo</span>
            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 900, color: '#111827', marginBottom: 14, lineHeight: 1.1 }}>
              Asegúrate con <span style={{ background: 'linear-gradient(135deg,#ca8a04,#a16207)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$500</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Reserva tu vehículo MG o MAXUS con solo $500 y accede a un precio preferencial hasta 30% por debajo del mercado. Completa el resto con un cronograma de cuotas y recíbelo en el mes 6.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['🛡️ Precio congelado', '📉 Hasta 30% menos', '📅 Cuotas programadas', '🚗 Entrega mes 6', '✅ Sin letra chica'].map(p => (
                <span key={p} className="lo-perk">{p}</span>
              ))}
            </div>
          </div>
          <AC500Filtro vehiculos={acLista} />
        </section>
      )}

      {/* ── CONTACTO ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #ececec', padding: '56px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 12 }}>Contacto directo</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Sede Maturín</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            Atención personalizada en <strong style={{ color: '#374151' }}>Maturín, Estado Monagas</strong>.<br />Cotizaciones aprobadas en tiempo real.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <a href="https://wa.link/uc69id" target="_blank" rel="noopener noreferrer" className="lo-btn-wa">WhatsApp oficial</a>
            <a href="https://wa.link/posuml" target="_blank" rel="noopener noreferrer" className="lo-btn-glass">Servicio técnico</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '30px 16px', textAlign: 'center' }}>
        <img src={LOGO} alt="La Oriental" style={{ height: 22, objectFit: 'contain', filter: 'invert(1)', opacity: .4, marginBottom: 12 }} />
        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, marginBottom: 4 }}>La Oriental Automotors · Representantes oficiales MG &amp; MAXUS · Sede Maturín</p>
        <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 11 }}>* Precios referenciales. Consulta disponibilidad con tu asesor.</p>
      </footer>

      {/* ── STICKY BOTTOM NAV ─────────────────────────────────────────────── */}
      <StickyNav hasAC500={acLista.length > 0} />
    </div>
  )
}
