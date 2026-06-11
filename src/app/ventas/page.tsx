import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from './VehiculosFiltro'
import AC500Filtro from './AC500Filtro'

const LOGO    = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const MG_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e64a9efded9c776ffb5.png'
const MX_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e646bac2400279a352f.png'
const WA_BASE = 'https://wa.me/584149989010'
const WA_MSG  = encodeURIComponent('Hola 👋 Vengo de la página de La Oriental y quiero información sobre los planes de compra.')
const WA_FIN  = encodeURIComponent('Hola 👋 Vengo de la web y quiero información sobre el plan de financiamiento 40% inicial + 24 cuotas.')

export const revalidate = 60

export default async function VentasPage() {
  const supabase = await createClient()

  const [{ data: catalogo }, { data: ac500 }] = await Promise.all([
    supabase.from('catalogo_ventas').select('*').eq('disponible', true).order('orden'),
    supabase.from('ac500_vehiculos').select('*').eq('disponible', true).order('orden'),
  ])

  const lista = catalogo ?? []
  const acLista = (ac500 ?? []).filter(v => v.p6_activo || v.p9_activo)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 0' }}>
        <div className="lo-glass" style={{ padding: '30px 34px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <img src={LOGO} alt="La Oriental" style={{ height: 38, objectFit: 'contain' }} />
              <div style={{ width: 1, height: 30, background: '#ececec' }} className="lo-brand-sep" />
              <div className="lo-brand-pill">
                <img src={MG_LOGO} alt="MG" style={{ height: 17, objectFit: 'contain' }} />
                <span style={{ width: 1, height: 16, background: '#e5e7eb' }} />
                <img src={MX_LOGO} alt="MAXUS" style={{ height: 17, objectFit: 'contain' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="lo-pill-loc">📍 Maturín, Monagas</span>
              <span className="lo-pill-online"><span className="lo-dot" /> Asesores en línea</span>
            </div>
          </div>

          <div className="lo-hairline" style={{ marginBottom: 24 }} />

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, lineHeight: 1.12, color: '#111827', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Tu próximo vehículo <span style={{ color: '#a16207' }}>MG</span> o <span style={{ color: '#a16207' }}>MAXUS</span><br />está aquí.
            </h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, maxWidth: 560 }}>
              Explora precios base y planes de financiamiento disponibles en nuestra sede de <strong style={{ color: '#374151' }}>Maturín</strong>. Nuestros asesores te acompañan en cada paso.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {acLista.length > 0 && <a href="#ac500" className="lo-btn-gold">🛡️ Plan $500</a>}
            <a href="#vehiculos" className="lo-btn-glass">Ver vehículos ↓</a>
            <a href={`${WA_BASE}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="lo-btn-wa">WhatsApp</a>
          </div>
        </div>

        {/* Cómo funciona */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 30 }}>
          {[
            { icon: '🔍', t: 'Revisa los precios base y planes', d: 'disponibles en esta página.' },
            { icon: '💬', t: 'Contacta a un asesor por WhatsApp', d: 'para confirmar disponibilidad.' },
            { icon: '📄', t: 'Tu asesor genera la cotización', d: 'formal desde el catálogo.' },
          ].map(s => (
            <div key={s.t} className="lo-info-box" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: '#111' }}>{s.t}</span>{' '}
                <span style={{ color: '#6b7280' }}>{s.d}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── VEHÍCULOS ─────────────────────────────────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px 56px' }}>
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
        <section id="ac500" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 16px' }}>
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
    </div>
  )
}
