import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from '../ventas/VehiculosFiltro'
import AC500Filtro from '../ventas/AC500Filtro'

const LOGO    = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const MG_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e64a9efded9c776ffb5.png'
const MX_LOGO = 'https://storage.googleapis.com/msgsndr/XZDJ4aSOAL1crWRCXyY6/media/69920e646bac2400279a352f.png'
export const revalidate = 60

const ORIGENES: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', whatsapp: 'WhatsApp', web: 'Web',
}

export default async function RedesPage({ searchParams }: { searchParams: Promise<{ origen?: string }> }) {
  const supabase = await createClient()
  const sp = await searchParams
  const origenParam = String(sp?.origen ?? '').toLowerCase().slice(0, 30)
  const origen = ORIGENES[origenParam] ?? (origenParam || 'redes_sociales')

  const [{ data: catalogo }, { data: ac500 }, { data: tasasCfg }, { data: conc }] = await Promise.all([
    supabase.from('catalogo_ventas').select('*').eq('disponible', true).order('orden'),
    supabase.from('ac500_vehiculos').select('*').eq('disponible', true).order('orden'),
    supabase.from('config_cotizaciones').select('clave, valor').in('clave', ['tasa_bcv', 'tasa_usdt', 'wa_corporativo', 'concesionario_id']),
    supabase.from('concesionarios').select('id, nombre_comercial, ciudad, estado, logo_url, color_primario, color_secundario').eq('es_principal', true).limit(1).maybeSingle(),
  ])

  const cfg = (k: string) => {
    const v = (tasasCfg ?? []).find(t => t.clave === k)?.valor
    return v == null ? '' : String(v)
  }
  const tasas = { bcv: Number(cfg('tasa_bcv')) || 0, usdt: Number(cfg('tasa_usdt')) || 0 }
  const waCorp = cfg('wa_corporativo').replace(/\D/g, '') || '584248705174'
  const concesionario = cfg('concesionario_id') || conc?.id || ''

  const personalizado = !!(conc?.nombre_comercial || conc?.ciudad)
  const brand = {
    nombre: conc?.nombre_comercial || 'JETPLUS',
    ciudad: conc?.ciudad || 'Porlamar',
    estado: conc?.estado || 'Estado Nueva Esparta',
    logo: conc?.logo_url || (personalizado ? '' : LOGO),
    colorPrimario: conc?.color_primario || '#C41E3A',
    colorSecundario: conc?.color_secundario || '#111827',
  }
  const brandImg = { nombre: brand.nombre, logo: brand.logo, colorPrimario: brand.colorPrimario, colorSecundario: brand.colorSecundario }

  const lista = catalogo ?? []
  const acActivos = (ac500 ?? []).filter(v => v.p6_activo || v.p9_activo || v.p12_activo)
  const acListaPL = acActivos.filter(v => v.regimen === 'puerto_libre')
  const acListaNac = acActivos.filter(v => v.regimen === 'nacional')

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 64 }}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 32, objectFit: 'contain' }} />}
            {brand.logo && <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{brand.nombre}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>Vehículos MG y MAXUS</p>
            </div>
          </div>
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

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 24px' }}>
        <div className="lo-glass" style={{ padding: '32px 36px' }}>
          <span className="lo-pill-online" style={{ marginBottom: 18, display: 'inline-flex' }}>
            <span className="lo-dot" /> Disponibilidad inmediata · {brand.ciudad}
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.1, color: '#111827', marginBottom: 14, letterSpacing: '-0.5px' }}>
            Tu próximo <span style={{ color: '#a16207' }}>MG</span> o <span style={{ color: '#a16207' }}>MAXUS</span> te está esperando
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, marginBottom: 28, maxWidth: 520 }}>
            Explora el catálogo y el Plan Asegúrate $500. Cuando encuentres el tuyo, un clic te conecta directo por WhatsApp con nuestro concesionario.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(acListaPL.length > 0 || acListaNac.length > 0) && <a href="#ac500" className="lo-btn-glass">🛡️ Plan $500 ↓</a>}
            <a href="#vehiculos" className="lo-btn-gold">Ver vehículos ↓</a>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 18 }}>* Precios referenciales. Consulta disponibilidad y condiciones con tu asesor.</p>
        </div>
      </div>

      {/* ── VEHÍCULOS ─────────────────────────────────────────────────────── */}
      <section id="vehiculos" style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 20px 56px' }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Sede {brand.ciudad} · Atención personalizada</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Vehículos MG &amp; MAXUS</h2>
        </div>
        <VehiculosFiltro vehiculos={lista} tasas={tasas} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
          modo="publico" origen={origen} />
      </section>

      {/* ── AC500 · PUERTO LIBRE ─────────────────────────────────────────── */}
      {acListaPL.length > 0 && (
        <section id="ac500" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🛡️ Plan exclusivo</span>
            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>
              AC500 <span style={{ background: 'linear-gradient(135deg,#ca8a04,#a16207)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Puerto Libre</span>
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
          <AC500Filtro vehiculos={acListaPL} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
            modo="publico" origen={origen} seccion="AC500 Puerto Libre" />
        </section>
      )}

      {/* ── AC500 · NACIONALES ───────────────────────────────────────────── */}
      {acListaNac.length > 0 && (
        <section id="ac500-nacionales" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', background: '#fef9c3', border: '1px solid rgba(234,179,8,.4)', color: '#92400e', padding: '5px 16px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', marginBottom: 18, textTransform: 'uppercase' }}>🛡️ Plan exclusivo</span>
            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', marginBottom: 14, lineHeight: 1.1 }}>
              AC500 <span style={{ background: 'linear-gradient(135deg,#ca8a04,#a16207)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Nacionales</span>
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
          <AC500Filtro vehiculos={acListaNac} waCorp={waCorp} concesionario={concesionario} brand={brandImg}
            modo="publico" origen={origen} seccion="AC500 Nacionales" />
        </section>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '30px 16px', textAlign: 'center' }}>
        {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 22, objectFit: 'contain', filter: 'invert(1)', opacity: .4, marginBottom: 12 }} />}
        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 12, marginBottom: 4 }}>{brand.nombre} · Representantes oficiales MG &amp; MAXUS · Sede {brand.ciudad}</p>
        <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 11 }}>* Precios referenciales. Consulta disponibilidad con tu asesor.</p>
      </footer>
    </div>
  )
}
