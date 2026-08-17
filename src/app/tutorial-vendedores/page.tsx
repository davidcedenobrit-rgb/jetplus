import TutorialStyles from '@/components/tutoriales/TutorialStyles'

export const metadata = {
  title: 'Tutorial Vendedores — JETPLUS',
  description: 'Guía paso a paso para usar el link de ventas de JetPlus.',
  robots: { index: false, follow: false },
}

export default function TutorialVendedoresPage() {
  return (
    <div className="tut">
      <TutorialStyles />
      <div className="sheet">

        <div className="cover">
          <span className="eyebrow">● Capacitación · Equipo de ventas</span>
          <h1 className="serif">Tutorial del link de vendedores</h1>
          <p>Guía paso a paso para usar el link de ventas de JetPlus: cotizar, registrar clientes y hacer seguimiento desde tu panel.</p>
          <div className="meta">
            <span><b>9</b> pasos</span>
            <span><b>MG &amp; MAXUS</b> · Porlamar</span>
            <span>jetplusventas.navigroup.co/ventas</span>
          </div>
        </div>

        <div className="intro">
          <div className="card"><div className="n">01</div><div className="l">Explora el catálogo y cotiza en segundos</div></div>
          <div className="card"><div className="n">02</div><div className="l">Registra a tus clientes sin perder ni uno</div></div>
          <div className="card"><div className="n">03</div><div className="l">Revisa tus resultados desde tu propio panel</div></div>
        </div>

        {/* Paso 1 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">1</div>
            <div className="step-title">
              <h2>Entra al link de ventas</h2>
              <p>Este es tu link de trabajo diario. Guárdalo en el navegador de tu teléfono o computadora.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Abre <b>jetplusventas.navigroup.co/ventas</b> en tu navegador.</li>
              <li><span className="bullet">2</span> Vas a ver el catálogo completo de MG y MAXUS con precios y planes.</li>
              <li><span className="bullet">3</span> No necesitas usuario ni contraseña para entrar — el link es abierto.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="url">jetplusventas.navigroup.co/ventas</span></div>
              <div className="mock-body">
                <div className="mk-line" style={{ width: '40%', marginBottom: 10 }}></div>
                <div className="mk-line" style={{ width: '70%', height: 14, marginBottom: 16 }}></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="mk-btn gold">👤 Registrar</span>
                  <span className="mk-btn ghost">Ver vehículos ↓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">2</div>
            <div className="step-title">
              <h2>Explora el catálogo de vehículos</h2>
              <p>Filtra por marca y muestra precio de contado y el plan de crédito 40% inicial a tu cliente.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Usa los filtros <b>Todos / MG / MAXUS</b> para acotar la búsqueda.</li>
              <li><span className="bullet">2</span> Cada carta muestra disponibilidad, precio de contado e inicial del 40%.</li>
              <li><span className="bullet">3</span> Baja hasta el vehículo que le interesa a tu cliente.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <span className="mk-btn dark" style={{ padding: '6px 12px' }}>Todos</span>
                  <span className="mk-btn ghost" style={{ padding: '6px 12px' }}>MG</span>
                  <span className="mk-btn ghost" style={{ padding: '6px 12px' }}>MAXUS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="mk-card"><div className="mk-line" style={{ width: '60%', marginBottom: 8 }}></div><div className="mk-line" style={{ width: '80%', height: 14 }}></div></div>
                  <div className="mk-card"><div className="mk-line" style={{ width: '60%', marginBottom: 8 }}></div><div className="mk-line" style={{ width: '80%', height: 14 }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 3 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">3</div>
            <div className="step-title">
              <h2>Cotización rápida — la más usada</h2>
              <p>Genera una imagen con el precio y las cuotas en segundos, lista para mandar por WhatsApp.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Presiona <b>⚡ Cotización rápida</b> en la carta del vehículo.</li>
              <li><span className="bullet">2</span> Se genera una imagen con el membrete de JetPlus, lista para compartir.</li>
              <li><span className="bullet">3</span> Envíala directo por WhatsApp desde el mismo botón.</li>
            </ul>
            <div className="tip"><span>💡</span><span><b>Cuándo usarla:</b> cuando el cliente solo quiere un precio rápido, sin generar una cotización formal todavía.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mk-btn gold mk-pointer" style={{ position: 'relative', padding: '12px 18px' }}>⚡ Cotización rápida<span className="badge-num">1</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 4 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">4</div>
            <div className="step-title">
              <h2>Cotización formal — con tu código</h2>
              <p>Genera un PDF oficial que queda registrado a tu nombre en el sistema.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Presiona el botón rojo <b>Cotización</b>.</li>
              <li><span className="bullet">2</span> Ingresa tu <b>código de vendedora</b> (letra + 3 dígitos).</li>
              <li><span className="bullet">3</span> Completa los datos del cliente y genera el PDF.</li>
              <li><span className="bullet">4</span> Esa cotización queda guardada en tu panel y llega a la bandeja del director.</li>
            </ul>
            <div className="tip"><span>💡</span><span><b>Importante:</b> tu código es personal — nunca lo compartas, es lo que te da el crédito por la venta.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div className="mk-card" style={{ marginBottom: 10 }}><div className="mk-line" style={{ width: '30%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '90%', height: 16 }}></div></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span className="mk-btn red mk-pointer" style={{ position: 'relative' }}>📄 Cotización<span className="badge-num">2</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 5 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">5</div>
            <div className="step-title">
              <h2>Plan Asegúrate $500</h2>
              <p>Con solo $500 tu cliente aparta el vehículo a un precio congelado y completa el resto en cuotas.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Baja hasta la sección <b>AC500</b> del link.</li>
              <li><span className="bullet">2</span> Hay dos versiones: <b>Puerto Libre</b> y <b>Nacionales</b> — según el vehículo.</li>
              <li><span className="bullet">3</span> Elige el cronograma de 6, 9 o 12 meses y el color disponible.</li>
              <li><span className="bullet">4</span> Cotiza igual que un vehículo normal, con su propio botón de cotización rápida y formal.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <span className="mk-btn dark" style={{ padding: '5px 10px', fontSize: 10 }}>6 meses</span>
                  <span className="mk-btn gold" style={{ padding: '5px 10px', fontSize: 10 }}>9 meses</span>
                  <span className="mk-btn ghost" style={{ padding: '5px 10px', fontSize: 10 }}>12 meses</span>
                </div>
                <div className="mk-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><div className="mk-line" style={{ width: '40%' }}></div><div className="mk-line" style={{ width: '20%' }}></div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><div className="mk-line" style={{ width: '40%' }}></div><div className="mk-line" style={{ width: '20%' }}></div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="mk-line" style={{ width: '40%', background: 'var(--gold)' }}></div><div className="mk-line" style={{ width: '20%', background: 'var(--gold)' }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 6 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">6</div>
            <div className="step-title">
              <h2>Ficha técnica del vehículo</h2>
              <p>Comparte la información técnica del carro lista para imprimir o enviar.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Si el vehículo tiene ficha cargada, verás el botón <b>📋 Ficha técnica</b> debajo de la carta.</li>
              <li><span className="bullet">2</span> Se abre la imagen de la ficha con dos opciones: descargar PDF o enviar por WhatsApp.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mk-btn ghost mk-pointer" style={{ position: 'relative', padding: '12px 18px' }}>📋 Ficha técnica<span className="badge-num">3</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 7 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">7</div>
            <div className="step-title">
              <h2>Registra a tu cliente</h2>
              <p>Deja constancia de cada persona que atiendes, aunque todavía no compre.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Sube hasta la sección <b>Registrar cliente nuevo</b>.</li>
              <li><span className="bullet">2</span> Completa nombre, teléfono, vehículo de interés y selecciona tu nombre.</li>
              <li><span className="bullet">3</span> Ese cliente queda en tu bandeja de leads, aunque aún no compre.</li>
            </ul>
            <div className="tip"><span>💡</span><span>Registrar al cliente es lo que evita que se te &quot;pierda&quot; un contacto — hazlo siempre, incluso si solo preguntó precios.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div className="mk-card"><div className="mk-line" style={{ width: '70%' }}></div></div>
                  <div className="mk-card"><div className="mk-line" style={{ width: '70%' }}></div></div>
                </div>
                <span className="mk-btn dark">Registrar cliente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 8 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">8</div>
            <div className="step-title">
              <h2>Tu panel — resultados y clientes</h2>
              <p>Entra con tu código y revisa tus leads, tus clientes y tus cotizaciones en un solo lugar.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Ve a <b>jetplusventas.navigroup.co/ventas/panel</b> o toca <b>Mi panel</b> en la barra inferior.</li>
              <li><span className="bullet">2</span> Ingresa tu código de vendedora.</li>
              <li><span className="bullet">3</span> Pestañas: <b>Resumen</b> (métricas), <b>Leads</b>, <b>Mis clientes</b>, <b>Cotizaciones</b>.</li>
              <li><span className="bullet">4</span> Desde ahí puedes escribirle por WhatsApp a cualquier lead o cliente con un solo toque.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="mk-card"><div className="mk-line" style={{ width: '50%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '30%', height: 16, background: 'var(--red)' }}></div></div>
                  <div className="mk-card"><div className="mk-line" style={{ width: '50%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '30%', height: 16, background: 'var(--gold)' }}></div></div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="mk-btn dark" style={{ padding: '5px 10px', fontSize: 10 }}>Resumen</span>
                  <span className="mk-btn ghost" style={{ padding: '5px 10px', fontSize: 10 }}>Leads</span>
                  <span className="mk-btn ghost" style={{ padding: '5px 10px', fontSize: 10 }}>Clientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 9 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">9</div>
            <div className="step-title">
              <h2>Barra de accesos rápidos</h2>
              <p>Abajo del todo tienes cuatro atajos que te llevan directo a cada sección.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> <b>👤 Registrar</b> — te lleva al formulario de registro de clientes.</li>
              <li><span className="bullet">2</span> <b>🚗 Vehículos</b> — sube directo al catálogo.</li>
              <li><span className="bullet">3</span> <b>🛡️ Plan $500</b> — salta a la sección AC500.</li>
              <li><span className="bullet">4</span> <b>👩‍💼 Mi panel</b> — entra a tu panel personal.</li>
            </ul>
            <div className="mock">
              <div className="mock-body" style={{ padding: 0, minHeight: 'auto' }}>
                <div style={{ display: 'flex' }}>
                  <span className="mk-btn" style={{ background: '#0f766e', flex: 1, borderRadius: 0, padding: '14px 0' }}>👤</span>
                  <span className="mk-btn dark" style={{ flex: 1, borderRadius: 0, padding: '14px 0' }}>🚗</span>
                  <span className="mk-btn red" style={{ flex: 1, borderRadius: 0, padding: '14px 0' }}>🛡️</span>
                  <span className="mk-btn" style={{ background: '#4338ca', flex: 1, borderRadius: 0, padding: '14px 0' }}>👩‍💼</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <span>JETPLUS — MG &amp; MAXUS, Porlamar</span>
          <span>Material de capacitación interna</span>
        </footer>

      </div>
    </div>
  )
}
