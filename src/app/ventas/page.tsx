import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from './VehiculosFiltro'

const LOGO    = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const MG_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e64a9efded9c776ffb5.png'
const MX_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e646bac2400279a352f.png'
const WA_BASE = 'https://wa.me/584149989010'
const WA_MSG  = encodeURIComponent('Hola 👋 Vengo de la página de La Oriental y quiero información sobre los planes de compra.')
const WA_FIN  = encodeURIComponent('Hola 👋 Vengo de la web y quiero información sobre el plan de financiamiento 40% inicial + 24 cuotas.')
const WA_AC   = encodeURIComponent('Hola 👋 Vengo de la web y quiero información sobre el plan Asegúrate con $500.')

export const revalidate = 60

function fm(n: number | null | undefined) {
  if (!n) return '—'
  return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: vehiculos } = await supabase
    .from('vehiculos_showroom')
    .select('*')
    .eq('disponible', true)
    .order('orden')

  const lista      = vehiculos ?? []
  const ac500Lista = lista.filter(v => v.ac500_visible)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HERO CARD ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 0' }}>
        <div className="lo-glass" style={{ padding: '28px 32px', marginBottom: 8 }}>

          {/* Top row: logos + location + online status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <img src={LOGO} alt="La Oriental" style={{ height: 36, objectFit: 'contain' }} />
              <div style={{ width: 1, height: 28, background: '#e5e7eb' }} className="lo-brand-sep" />
              <div className="lo-brand-pill">
                <img src={MG_LOGO} alt="MG" style={{ height: 16, objectFit: 'contain' }} />
                <span style={{ width: 1, height: 16, background: '#e5e7eb' }} />
                <img src={MX_LOGO} alt="MAXUS" style={{ height: 16, objectFit: 'contain' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="lo-location">
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Maturín, Monagas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12 }}>
                <div className="lo-dot" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>En línea</span>
              </div>
            </div>
          </div>

          <div className="lo-hairline" style={{ marginBottom: 22 }} />

          {/* Title + subtitle */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, lineHeight: 1.15, color: '#111827', marginBottom: 10, letterSpacing: '-0.3px' }}>
              Vehículos <span style={{ color: '#a16207' }}>MG</span> &amp; <span style={{ color: '#a16207' }}>MAXUS</span><br />
              en La Oriental Automotors
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 540 }}>
              Precios base y planes de financiamiento disponibles en nuestra sede de <strong style={{ color: '#374151' }}>Maturín</strong>. Consulta disponibilidad con un asesor.
            </p>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ac500Lista.length > 0 && (
              <a href="#ac500" className="lo-btn-gold">
                🛡️ Plan $500
              </a>
            )}
            <a href={`${WA_BASE}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="lo-btn-wa">
              WhatsApp
            </a>
            <a href="#vehiculos" className="lo-btn-glass">
              Ver vehículos ↓
            </a>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { icon: '✅', text: 'Financiamiento directo' },
            { icon: '✅', text: '40% de inicial' },
            { icon: '✅', text: '24 cuotas fijas' },
            { icon: '✅', text: 'Sin banco ni trámites' },
          ].map(b => (
            <span key={b.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 10px' }}>
              <span style={{ color: '#16a34a' }}>{b.icon}</span> {b.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── VEHÍCULOS ──────────────────────────────────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 4 }}>
            Sede Maturín · Atención personalizada
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>
            Catálogo de vehículos disponibles
          </h2>
        </div>

        <VehiculosFiltro vehiculos={lista} />
      </section>

      {/* ── PLAN 40% ───────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '56px 16px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,0.4)', color: '#92400e', padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 18, textTransform: 'uppercase' }}>
            📈 Financiamiento directo
          </span>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900, color: '#111827', marginBottom: 14, lineHeight: 1.2 }}>
            Estrena con <span style={{ color: '#a16207' }}>40% de inicial</span> y 24 cuotas fijas
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Sin bancos, sin trámites eternos. Financiamiento directo con La Oriental Automotors.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, maxWidth: 660, margin: '0 auto 32px' }}>
            {[
              { n: '01', icon: '🚗', title: 'Elige tu modelo', desc: 'SUVs, sedanes, pickups — el que mejor se adapte a tu estilo.' },
              { n: '02', icon: '💰', title: 'Entrega el 40% de inicial', desc: 'El 60% restante en cuotas mensuales fijas.' },
              { n: '03', icon: '🔑', title: 'Sal manejando ese día', desc: 'Al entregar la inicial, te llevas tu vehículo.' },
            ].map(step => (
              <div key={step.n} className="lo-info-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ca8a04', letterSpacing: '0.5px' }}>{step.n}</span>
                  <span style={{ fontSize: 22 }}>{step.icon}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 5 }}>{step.title}</p>
                <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <a href={`${WA_BASE}?text=${WA_FIN}`} target="_blank" rel="noopener noreferrer" className="lo-btn-wa">
            Consultar plan de financiamiento
          </a>
        </div>
      </section>

      {/* ── AC500 ──────────────────────────────────────────────────────────── */}
      {ac500Lista.length > 0 && (
        <section id="ac500" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,0.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 18, textTransform: 'uppercase' }}>
              🛡️ Plan exclusivo
            </span>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 14, lineHeight: 1.1 }}>
              Asegúrate con <span style={{ color: '#ca8a04' }}>$500</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Reserva tu vehículo MG o MAXUS con solo $500 y accede a precios preferenciales. Completa el monto en cuotas y recíbelo en el mes 6.
            </p>
          </div>

          {/* Beneficios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, maxWidth: 740, margin: '0 auto 40px' }}>
            {[
              { icon: '🛡️', t: 'Asegura el precio de hoy', d: 'Con $500 congelas el precio actual.' },
              { icon: '📉', t: 'Hasta 30% por debajo del mercado', d: 'Precios muy por debajo del valor de mercado.' },
              { icon: '📅', t: 'Cronograma de cuotas', d: 'Completa el monto con cuotas programadas.' },
              { icon: '🚗', t: 'Entrega en el mes 6', d: 'Tu vehículo nuevo en el mes 6.' },
            ].map(b => (
              <div key={b.t} className="lo-info-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{b.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 5 }}>{b.t}</p>
                <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{b.d}</p>
              </div>
            ))}
          </div>

          {/* Cards AC500 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
            {ac500Lista.map(v => (
              <div key={v.id} className="lo-ac-card">
                {/* Image */}
                <div style={{ height: 175, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {v.img_url ? (
                    <img src={v.img_url} alt={v.model} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 14 }} />
                  ) : (
                    <span style={{ fontSize: 44, opacity: 0.15 }}>🚗</span>
                  )}
                  <span style={{
                    position: 'absolute', top: 10, left: 10,
                    background: v.brand === 'MG' ? '#dc2626' : '#1d4ed8',
                    color: '#fff', fontSize: 10, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 999, letterSpacing: '0.5px'
                  }}>{v.brand}</span>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 18px 18px' }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 4 }}>{v.model}</p>
                  {v.cash && (
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Precio base: ${fm(v.cash)}</p>
                  )}

                  {/* Planes cuotas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {v.ac500_6m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>6 meses</span>
                        <span style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>${fm(v.ac500_6m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af' }}>/mes</span></span>
                      </div>
                    )}
                    {v.ac500_9m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>9 meses</span>
                        <span style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>${fm(v.ac500_9m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af' }}>/mes</span></span>
                      </div>
                    )}
                    {v.ac500_12m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef9c3', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 10, padding: '8px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>12 meses</span>
                        <span style={{ fontWeight: 800, color: '#ca8a04', fontSize: 14 }}>${fm(v.ac500_12m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: '#a16207' }}>/mes</span></span>
                      </div>
                    )}
                    {!v.ac500_6m_cuota && !v.ac500_9m_cuota && !v.ac500_12m_cuota && (
                      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Consulta condiciones con tu asesor</p>
                    )}
                  </div>

                  <a
                    href={`${WA_BASE}?text=${encodeURIComponent(`Hola 👋 vengo de la web de La Oriental y quiero información sobre el plan AC500 del ${v.model}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="lo-card-wa"
                    style={{ textDecoration: 'none', marginBottom: 0 }}
                  >
                    Consultar plan AC500
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={`${WA_BASE}?text=${WA_AC}`} target="_blank" rel="noopener noreferrer" className="lo-btn-gold">
              🛡️ Consultar plan AC500 por WhatsApp
            </a>
            <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 14 }}>
              Cupos limitados. Consulta disponibilidad de modelos con nuestro equipo.
            </p>
          </div>
        </section>
      )}

      {/* ── CONTACTO ───────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '52px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 12 }}>Contacto directo</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Sede Maturín</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            Atención personalizada en <strong style={{ color: '#374151' }}>Maturín, Estado Monagas</strong>.<br />
            Cotizaciones aprobadas en tiempo real.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <a href="https://wa.link/uc69id" target="_blank" rel="noopener noreferrer" className="lo-btn-wa">
              WhatsApp oficial
            </a>
            <a href="https://wa.link/posuml" target="_blank" rel="noopener noreferrer" className="lo-btn-glass">
              Servicio técnico
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '28px 16px', textAlign: 'center' }}>
        <img src={LOGO} alt="La Oriental" style={{ height: 22, objectFit: 'contain', filter: 'invert(1)', opacity: 0.4, marginBottom: 12 }} />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 4 }}>
          La Oriental Automotors · Representantes oficiales MG &amp; MAXUS · Sede Maturín
        </p>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>
          * Precios referenciales. Consulta disponibilidad con tu asesor.
        </p>
      </footer>
    </div>
  )
}
