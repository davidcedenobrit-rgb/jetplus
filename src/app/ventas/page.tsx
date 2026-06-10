import { createClient } from '@/lib/supabase/server'
import VehiculosFiltro from './VehiculosFiltro'

const LOGO = 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
const WA = 'https://wa.me/584120000000'
const WA_AC500 = 'https://wa.me/584120000000?text=Hola, quiero información sobre el Plan Asegúrate con $500'

export const revalidate = 60

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: vehiculos } = await supabase
    .from('vehiculos_showroom')
    .select('*')
    .eq('disponible', true)
    .order('orden')

  const vehiculosPublicos = vehiculos ?? []
  const vehiculosAC500 = vehiculosPublicos.filter(v => v.ac500_visible)

  function fm(n: number | null) {
    return n ? Number(n).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Topbar */}
      <header className="bg-[#111] border-b border-white/8 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="La Oriental" className="h-8 object-contain" style={{ filter: 'invert(1)' }} />
          <div className="hidden sm:block">
            <p className="text-xs text-white/40 leading-none">Representantes oficiales · MG y MAXUS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="hidden sm:inline">📍 Maturín, Monagas</span>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#16a34a] text-white rounded-lg font-semibold text-xs hover:bg-[#15803d] transition-colors">
            WhatsApp ↗
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20">MG</span>
          <span className="text-white/20">·</span>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-600/10 px-3 py-1 rounded-full border border-blue-600/20">MAXUS</span>
          <span className="text-white/20">·</span>
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">MATURÍN</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
          Tu próximo vehículo<br />
          <span className="text-red-500">MG</span> o <span className="text-blue-400">MAXUS</span> está aquí.
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
          Explora precios base y planes de financiamiento disponibles en nuestra sede de <span className="text-white/80">Maturín</span>. Nuestros asesores te acompañan en cada paso.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="#vehiculos" className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
            Ver vehículos →
          </a>
          {vehiculosAC500.length > 0 && (
            <a href="#ac500" className="px-6 py-3 bg-white/8 text-white font-bold rounded-xl hover:bg-white/15 transition-colors border border-white/10">
              Plan $500 →
            </a>
          )}
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 bg-white/8 text-white font-bold rounded-xl hover:bg-white/15 transition-colors border border-white/10">
            WhatsApp ↗
          </a>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-[#111] border-y border-white/6 py-12 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 text-center mb-8">¿Cómo funciona?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔍', title: 'Revisa precios y planes', desc: 'Explora los precios base y planes de financiamiento disponibles en esta página.' },
              { icon: '💬', title: 'Contacta a un asesor', desc: 'Escríbenos por WhatsApp para confirmar disponibilidad y ajustar el plan a tu medida.' },
              { icon: '📄', title: 'Cotización formal', desc: 'Tu asesor genera una cotización formal desde el catálogo oficial.' },
            ].map(item => (
              <div key={item.title} className="text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vehículos */}
      <section id="vehiculos" className="max-w-6xl mx-auto px-5 py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Sede Maturín</p>
          <h2 className="text-2xl font-black text-white">Vehículos disponibles</h2>
          <p className="text-white/40 text-sm mt-1">*Precio base y plan de financiamiento disponibles en cada modelo.</p>
        </div>
        <VehiculosFiltro vehiculos={vehiculosPublicos} />
      </section>

      {/* Financiamiento directo */}
      <section className="bg-[#111] border-y border-white/6 py-14 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">📈 Financiamiento directo</p>
          <h2 className="text-3xl font-black mb-4">
            Estrena con <span className="text-red-500">40% de inicial</span> y<br className="hidden sm:block" /> 24 cuotas fijas
          </h2>
          <p className="text-white/50 max-w-lg mx-auto mb-8">
            Sin bancos, sin trámites eternos. Financiamiento directo con La Oriental Automotors. Tú eliges el modelo, nosotros ajustamos el plan a tu medida.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            {['✅ Financiamiento directo', '✅ Cuotas fijas en dólares', '✅ Sin banco ni trámites', '✅ Entrega inmediata'].map(item => (
              <div key={item} className="bg-white/5 rounded-xl px-3 py-3 text-sm text-white/70 font-medium border border-white/8">{item}</div>
            ))}
          </div>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
            Consultar por WhatsApp
          </a>
        </div>
      </section>

      {/* AC500 */}
      {vehiculosAC500.length > 0 && (
        <section id="ac500" className="max-w-6xl mx-auto px-5 py-14">
          <div className="mb-10 text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-red-500 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20 mb-4">🛡️ Plan exclusivo</span>
            <h2 className="text-3xl font-black mb-3">
              Asegúrate con <span className="text-red-500">$500</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Reserva tu vehículo MG o MAXUS con solo $500 y accede a un precio preferencial.
              Completa el resto con un cronograma de cuotas y recíbelo en el mes 6.
            </p>
          </div>

          {/* Beneficios AC500 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { icon: '🛡️', label: 'Precio congelado' },
              { icon: '📉', label: 'Hasta 30% menos' },
              { icon: '📅', label: 'Cuotas programadas' },
              { icon: '🚗', label: 'Entrega mes 6' },
            ].map(b => (
              <div key={b.label} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs font-semibold text-white/60">{b.label}</p>
              </div>
            ))}
          </div>

          {/* Cards AC500 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehiculosAC500.map(v => (
              <div key={v.id} className="bg-[#1a1a1a] border border-red-600/20 rounded-2xl overflow-hidden">
                {/* Imagen */}
                <div className="relative h-40 bg-[#111] flex items-center justify-center">
                  {v.img_url ? (
                    <img src={v.img_url} alt={v.model} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-white/20 text-4xl">🚗</div>
                  )}
                  <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${v.brand === 'MG' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {v.brand}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-white mb-1">{v.model}</h3>
                  {v.cash && <p className="text-white/40 text-xs mb-4">Precio base: ${fm(v.cash)}</p>}

                  {/* Planes */}
                  <div className="space-y-2">
                    {v.ac500_6m_cuota && (
                      <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-xs text-white/50 font-semibold">6 meses</span>
                        <span className="font-bold text-white">${fm(v.ac500_6m_cuota)}<span className="text-[10px] font-normal text-white/40">/mes</span></span>
                      </div>
                    )}
                    {v.ac500_9m_cuota && (
                      <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-xs text-white/50 font-semibold">9 meses</span>
                        <span className="font-bold text-white">${fm(v.ac500_9m_cuota)}<span className="text-[10px] font-normal text-white/40">/mes</span></span>
                      </div>
                    )}
                    {v.ac500_12m_cuota && (
                      <div className="flex justify-between items-center bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
                        <span className="text-xs text-red-400 font-semibold">12 meses</span>
                        <span className="font-bold text-red-400">${fm(v.ac500_12m_cuota)}<span className="text-[10px] font-normal text-red-500/60">/mes</span></span>
                      </div>
                    )}
                    {!v.ac500_6m_cuota && !v.ac500_9m_cuota && !v.ac500_12m_cuota && (
                      <p className="text-xs text-white/30 text-center py-2">Consulta las condiciones con tu asesor</p>
                    )}
                  </div>

                  <a
                    href={`${WA}?text=Hola, quiero información sobre el Plan AC500 para el ${v.model}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center mt-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    Consultar plan AC500
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-white/25 text-xs mt-8">
            Cupos limitados. Consulta disponibilidad de modelos y cronograma de cuotas con nuestro equipo.
          </p>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#111] border-t border-white/6 px-5 py-8 text-center">
        <img src={LOGO} alt="La Oriental" className="h-6 object-contain mx-auto mb-3" style={{ filter: 'invert(1)', opacity: 0.4 }} />
        <p className="text-white/25 text-xs">
          La Oriental Automotors · Representantes oficiales MG &amp; MAXUS · Sede Maturín
        </p>
        <p className="text-white/20 text-[11px] mt-2">
          * Los precios mostrados son referenciales y pueden variar. Consulta disponibilidad con tu asesor.
        </p>
      </footer>
    </div>
  )
}
