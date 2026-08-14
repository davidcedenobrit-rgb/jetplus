import { createClient } from '@/lib/supabase/server'
import AliadosGate from './AliadosGate'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
export const revalidate = 60

export default async function AliadosPage() {
  const supabase = await createClient()

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

  const acActivos = (ac500 ?? []).filter(v => v.p6_activo || v.p9_activo || v.p12_activo)

  return (
    <AliadosGate
      vehiculos={catalogo ?? []}
      ac500PL={acActivos.filter(v => v.regimen === 'puerto_libre')}
      ac500Nac={acActivos.filter(v => v.regimen === 'nacional')}
      tasas={tasas}
      waCorp={waCorp}
      concesionario={concesionario}
      brand={brand}
    />
  )
}
