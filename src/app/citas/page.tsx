import { createClient } from '@/lib/supabase/server'
import CitasForm from './CitasForm'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
export const revalidate = 0

export default async function CitasPage() {
  const supabase = await createClient()
  const { data: conc } = await supabase
    .from('concesionarios')
    .select('nombre_comercial, ciudad, estado, logo_url')
    .eq('es_principal', true)
    .limit(1)
    .maybeSingle()

  const personalizado = !!(conc?.nombre_comercial || conc?.ciudad)
  const brand = {
    nombre: conc?.nombre_comercial || 'JETPLUS',
    ciudad: conc?.ciudad || 'Porlamar',
    logo: conc?.logo_url || (personalizado ? '' : LOGO),
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 64 }}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {brand.logo && <img src={brand.logo} alt={brand.nombre} style={{ height: 32, objectFit: 'contain' }} />}
          {brand.logo && <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />}
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{brand.nombre}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>Taller de servicio · {brand.ciudad}</p>
          </div>
        </div>
      </div>

      {/* ── HERO + FORM ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span className="lo-pill-online" style={{ marginBottom: 14, display: 'inline-flex' }}>
            <span className="lo-dot" /> Agenda en línea
          </span>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, lineHeight: 1.15, color: '#fff', marginBottom: 8 }}>
            Reserva tu cita de taller
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Elige el día y la hora que mejor te queden. Confirmamos por WhatsApp y por correo al instante.
          </p>
        </div>

        <CitasForm />
      </div>
    </div>
  )
}
