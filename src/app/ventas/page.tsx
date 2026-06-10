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

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: vehiculos } = await supabase
    .from('vehiculos_showroom')
    .select('*')
    .eq('disponible', true)
    .order('orden')

  const lista      = vehiculos ?? []
  const ac500Lista = lista.filter(v => v.ac500_visible)

  function fm(n: number | null | undefined) {
    if (!n) return '—'
    return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOPBAR ─────────────────────────────── */}
      <header style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={LOGO} alt="La Oriental" style={{ height: 34, objectFit: 'contain', filter: 'invert(1)' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <img src={MG_LOGO} alt="MG" style={{ height: 18, objectFit: 'contain' }} />
            <img src={MX_LOGO} alt="MAXUS" style={{ height: 18, objectFit: 'contain' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>📍 Maturín, Monagas</span>
          <a href={`${WA_BASE}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer"
            style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            WhatsApp ↗
          </a>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          <span style={{ background: 'rgba(220,38,38,0.15)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.3)', padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>MG</span>
          <span style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)', padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>MAXUS</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.8px' }}>MATURÍN</span>
        </div>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 18, letterSpacing: '-0.5px' }}>
          Tu próximo vehículo<br />
          <span style={{ color: '#ef4444' }}>MG</span> o <span style={{ color: '#60a5fa' }}>MAXUS</span> está aquí.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Explora precios base y planes de financiamiento disponibles en nuestra sede de{' '}
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>Maturín</span>. Nuestros asesores te acompañan en cada paso.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#vehiculos" className="v-btn-red">Ver vehículos →</a>
          {ac500Lista.length > 0 && (
            <a href="#ac500" className="v-btn-ghost">Plan $500 →</a>
          )}
          <a href={`${WA_BASE}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="v-btn-ghost">WhatsApp ↗</a>
          <a href="#asesor" className="v-btn-ghost">Formulario →</a>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 24 }}>
          * Los precios mostrados son referenciales y pueden variar. Consulta disponibilidad con tu asesor.
        </p>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', marginBottom: 32 }}>¿Cómo funciona?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { icon: '🔍', title: 'Revisa los precios base y planes', desc: 'disponibles en esta página.' },
              { icon: '💬', title: 'Contacta a un asesor por WhatsApp', desc: 'para confirmar disponibilidad.' },
              { icon: '📄', title: 'Tu asesor genera una cotización formal', desc: 'desde el catálogo.' },
            ].map(item => (
              <div key={item.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{item.title}</span>{' '}
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VEHÍCULOS ───────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Sede Maturín · Atención personalizada</p>
          <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Vehículos MG &amp; MAXUS — La Oriental</h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Vehículos disponibles en Sede Maturín</p>
        </div>

        <VehiculosFiltro vehiculos={lista} />
      </section>

      {/* ── FINANCIAMIENTO 40% ──────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>📈 Financiamiento directo</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
            Estrena tu vehículo con <span style={{ color: '#ef4444' }}>40% de inicial</span> y 24 cuotas fijas
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Sin bancos, sin trámites eternos. Financiamiento directo con La Oriental Automotors. Tú eliges el modelo, nosotros ajustamos el plan a tu medida.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, maxWidth: 680, margin: '0 auto 36px' }}>
            {[
              { n: '01', icon: '🚗', title: 'Elige tu modelo', desc: 'SUVs, sedanes, pickups — el que mejor se adapte a tu estilo.' },
              { n: '02', icon: '💰', title: 'Entrega el 40% de inicial', desc: 'La inicial se ajusta a tu medida. El 60% en cuotas mensuales fijas.' },
              { n: '03', icon: '🔑', title: 'Sal manejando el mismo día', desc: 'Al entregar la inicial, te llevas tu vehículo nuevo ese mismo día.' },
            ].map(step => (
              <div key={step.n} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 800 }}>{step.n}</span>
                  <span style={{ fontSize: 20 }}>{step.icon}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{step.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 20, padding: '28px 32px', maxWidth: 480, margin: '0 auto 32px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: '#ef4444' }}>40%</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)' }}>
              Solo necesitas el <strong style={{ color: '#fff' }}>40% del precio base</strong> como inicial. El{' '}
              <strong style={{ color: '#fff' }}>60% restante</strong> se divide en{' '}
              <strong style={{ color: '#fff' }}>24 cuotas mensuales fijas</strong>, directo con La Oriental.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8 }}>Sin banco, sin fiador, sin letra chica.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 16 }}>
              {['✅ Financiamiento directo', '✅ Cuotas fijas en dólares', '✅ Sin banco ni trámites', '✅ Entrega inmediata', '✅ Inicial ajustable'].map(t => (
                <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{t}</span>
              ))}
            </div>
          </div>

          <a href={`${WA_BASE}?text=${WA_FIN}`} target="_blank" rel="noopener noreferrer" className="v-btn-red">
            Consultar por WhatsApp
          </a>
        </div>
      </section>

      {/* ── AC500 ───────────────────────────────── */}
      {ac500Lista.length > 0 && (
        <section id="ac500" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#ef4444', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 18 }}>
              🛡️ Plan exclusivo
            </span>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginBottom: 14, lineHeight: 1.1 }}>
              Asegúrate con <span style={{ color: '#ef4444' }}>$500</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
              Reserva tu vehículo MG o MAXUS con solo $500 y accede a un precio preferencial hasta 30% por debajo del mercado. Completa el resto con un cronograma de cuotas y recíbelo en el mes 6.
            </p>
          </div>

          {/* Beneficios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, maxWidth: 760, margin: '0 auto 44px' }}>
            {[
              { icon: '🛡️', t: 'Asegura el precio de hoy', d: 'Con $500 congelas el precio actual de tu vehículo.' },
              { icon: '📉', t: 'Hasta 30% por debajo del mercado', d: 'Accede a precios significativamente menores al valor de mercado.' },
              { icon: '📅', t: 'Cronograma de cuotas', d: 'Completa el monto con cuotas programadas hasta la entrega.' },
              { icon: '🚗', t: 'Entrega en el mes 6', d: 'Tu vehículo nuevo te espera en el mes 6.' },
            ].map(b => (
              <div key={b.t} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#fff' }}>{b.t}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{b.d}</p>
              </div>
            ))}
          </div>

          {/* Cards AC500 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {ac500Lista.map(v => (
              <div key={v.id} className="v-card">
                <div style={{ height: 180, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {v.img_url ? (
                    <img src={v.img_url} alt={v.model} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16 }} />
                  ) : (
                    <span style={{ fontSize: 48, opacity: 0.2 }}>🚗</span>
                  )}
                  <span className={`v-tag ${v.brand === 'MG' ? 'v-tag-mg' : 'v-tag-maxus'}`}
                    style={{ position: 'absolute', top: 12, left: 12 }}>{v.brand}</span>
                </div>
                <div style={{ padding: 20 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{v.model}</p>
                  {v.cash && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 14 }}>Precio base: ${fm(v.cash)}</p>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {v.ac500_6m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '9px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>6 meses</span>
                        <span style={{ fontWeight: 800, color: '#fff' }}>${fm(v.ac500_6m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mes</span></span>
                      </div>
                    )}
                    {v.ac500_9m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '9px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>9 meses</span>
                        <span style={{ fontWeight: 800, color: '#fff' }}>${fm(v.ac500_9m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mes</span></span>
                      </div>
                    )}
                    {v.ac500_12m_cuota && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '9px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>12 meses</span>
                        <span style={{ fontWeight: 800, color: '#ef4444' }}>${fm(v.ac500_12m_cuota)}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(239,68,68,0.5)' }}>/mes</span></span>
                      </div>
                    )}
                    {!v.ac500_6m_cuota && !v.ac500_9m_cuota && !v.ac500_12m_cuota && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '8px 0' }}>Consulta condiciones con tu asesor</p>
                    )}
                  </div>
                  <a href={`${WA_BASE}?text=${encodeURIComponent(`Hola 👋 vengo de la web de La Oriental y quiero información sobre el plan AC500 del ${v.model}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', width: '100%', padding: '11px 0', background: '#dc2626', color: '#fff', fontWeight: 700, borderRadius: 10, textAlign: 'center', textDecoration: 'none', fontSize: 13, transition: 'background 0.15s', boxSizing: 'border-box' }}>
                    Consultar plan AC500
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a href={`${WA_BASE}?text=${WA_AC}`} target="_blank" rel="noopener noreferrer" className="v-btn-red" style={{ display: 'inline-block' }}>
              Consultar plan AC500 por WhatsApp
            </a>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 14 }}>
              Cupos limitados. Consulta disponibilidad de modelos y cronograma de cuotas con nuestro equipo.
            </p>
          </div>
        </section>
      )}

      {/* ── FORMULARIO ASESOR ───────────────────── */}
      <section id="asesor" style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Contacto directo</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Sede Maturín</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
            Atención personalizada en <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Maturín, Estado Monagas</strong>.<br />
            Cotizaciones aprobadas en tiempo real.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <a href="https://wa.link/uc69id" target="_blank" rel="noopener noreferrer"
              style={{ padding: '12px 22px', background: '#16a34a', color: '#fff', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
              Whatsapp oficial
            </a>
            <a href="https://wa.link/posuml" target="_blank" rel="noopener noreferrer"
              style={{ padding: '12px 22px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
              Servicio técnico
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <img src={LOGO} alt="La Oriental" style={{ height: 22, objectFit: 'contain', filter: 'invert(1)', opacity: 0.35, marginBottom: 12 }} />
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginBottom: 4 }}>
          La Oriental Automotors · Representantes oficiales MG &amp; MAXUS · Sede Maturín
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
          * Los precios mostrados son referenciales y pueden variar. Consulta disponibilidad con tu asesor.
        </p>
      </footer>
    </div>
  )
}
