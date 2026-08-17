import TutorialStyles from '@/components/tutoriales/TutorialStyles'

export const metadata = {
  title: 'Tutorial Aliados — JETPLUS',
  description: 'Guía paso a paso para usar el link de aliados de JetPlus.',
  robots: { index: false, follow: false },
}

export default function TutorialAliadosPage() {
  return (
    <div className="tut">
      <TutorialStyles />
      <div className="sheet">

        <div className="cover">
          <span className="eyebrow">● Capacitación · Red de aliados</span>
          <h1 className="serif">Tutorial del link de aliados</h1>
          <p>Guía paso a paso para referir clientes al concesionario, hacerles seguimiento, y resolver sus dudas con argumentos sólidos.</p>
          <div className="meta">
            <span><b>9</b> pasos</span>
            <span><b>Inmobiliarias y seguros</b></span>
            <span>jetplusventas.navigroup.co/aliados</span>
          </div>
        </div>

        <div className="intro">
          <div className="card"><div className="n">01</div><div className="l">Entra con tu código y muestra el catálogo</div></div>
          <div className="card"><div className="n">02</div><div className="l">Envía al cliente directo al concesionario</div></div>
          <div className="card"><div className="n">03</div><div className="l">Haz seguimiento a todos tus referidos</div></div>
        </div>

        {/* Paso 1 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">1</div>
            <div className="step-title">
              <h2>Entra con tu código de acceso</h2>
              <p>Tu código es personal e intransferible — identifica cada cliente que refieres.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Abre <b>jetplusventas.navigroup.co/aliados</b>.</li>
              <li><span className="bullet">2</span> Ingresa tu código (una letra + 3 dígitos, ej. <b>A101</b>).</li>
              <li><span className="bullet">3</span> El navegador lo recuerda — no tendrás que escribirlo cada vez.</li>
            </ul>
            <div className="tip"><span>🔒</span><span><b>No compartas tu código.</b> Es lo que identifica los clientes que tú refieres para que se te reconozcan.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="url">jetplusventas.navigroup.co/aliados</span></div>
              <div className="mock-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <span className="kbd">A 1 0 1</span>
                <span className="mk-btn gold">Entrar →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">2</div>
            <div className="step-title">
              <h2>Explora el catálogo y el Plan $500</h2>
              <p>Las mismas pestañas de arriba te llevan a cada sección.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Pestaña <b>Catálogo</b> — vehículos MG y MAXUS con precio de contado y crédito.</li>
              <li><span className="bullet">2</span> Pestaña <b>Plan $500</b> — reserva con solo $500 y cuotas programadas.</li>
              <li><span className="bullet">3</span> Muéstraselos a tu cliente directamente desde tu teléfono.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className="mk-btn red" style={{ padding: '6px 12px', fontSize: 10 }}>Catálogo</span>
                  <span className="mk-btn ghost" style={{ padding: '6px 12px', fontSize: 10 }}>Plan $500</span>
                  <span className="mk-btn ghost" style={{ padding: '6px 12px', fontSize: 10 }}>MG y MAXUS</span>
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
              <h2>Envía a concesionario</h2>
              <p>El botón más importante de todos — es como refieres formalmente a tu cliente.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> En la carta del vehículo, presiona el botón rojo <b>Enviar</b>.</li>
              <li><span className="bullet">2</span> Completa nombre y teléfono del cliente.</li>
              <li><span className="bullet">3</span> Marca si el cliente ya tiene una inicial disponible (y el monto, si lo sabes).</li>
              <li><span className="bullet">4</span> Se abre WhatsApp con el mensaje ya armado — solo dale <b>Enviar</b>.</li>
            </ul>
            <div className="tip green"><span>✅</span><span><b>Con esto ya quedó:</b> el cliente registrado en tu panel y el equipo de JetPlus recibió el contacto por WhatsApp al instante.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div className="mk-card" style={{ marginBottom: 8 }}><div className="mk-line" style={{ width: '40%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '90%', height: 14 }}></div></div>
                <div className="mk-card" style={{ marginBottom: 10 }}><div className="mk-line" style={{ width: '40%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '90%', height: 14 }}></div></div>
                <span className="mk-btn green mk-pointer" style={{ position: 'relative' }}>📲 Enviar por WhatsApp<span className="badge-num">1</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 4 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">4</div>
            <div className="step-title">
              <h2>Conoce las marcas: MG y MAXUS</h2>
              <p>Argumentos listos para presentarle la marca a tu cliente con seguridad.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Pestaña <b>MG y MAXUS</b> en la parte de arriba.</li>
              <li><span className="bullet">2</span> Encuentras la historia de cada marca y por qué son una opción sólida frente a marcas tradicionales.</li>
              <li><span className="bullet">3</span> Úsalo antes de referir, para presentar el vehículo con confianza.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div className="mk-line" style={{ width: '30%', marginBottom: 10, background: 'var(--gold)' }}></div>
                <div className="mk-line" style={{ width: '100%', marginBottom: 6 }}></div>
                <div className="mk-line" style={{ width: '95%', marginBottom: 6 }}></div>
                <div className="mk-line" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 5 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">5</div>
            <div className="step-title">
              <h2>Manejo de objeciones</h2>
              <p>Las dudas más comunes de un cliente, con la respuesta ya lista.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Pestaña <b>Manejo de objeciones</b>.</li>
              <li><span className="bullet">2</span> Cada tarjeta tiene la pregunta típica del cliente y cómo responderla.</li>
              <li><span className="bullet">3</span> Ejemplos: &quot;No conozco la marca&quot;, &quot;El precio me parece alto&quot;, &quot;Lo voy a pensar&quot;.</li>
            </ul>
            <div className="tip"><span>💬</span><span>Repásalas antes de tu primera referencia — te van a dar seguridad en la conversación con el cliente.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div className="mk-card" style={{ marginBottom: 8 }}><div className="mk-line" style={{ width: '70%', background: 'var(--red)', marginBottom: 8 }}></div><div className="mk-line" style={{ width: '95%' }}></div></div>
                <div className="mk-card"><div className="mk-line" style={{ width: '60%', background: 'var(--red)', marginBottom: 8 }}></div><div className="mk-line" style={{ width: '90%' }}></div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 6 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">6</div>
            <div className="step-title">
              <h2>Cómo funciona — el manual</h2>
              <p>Un repaso rápido de todos los pasos, siempre disponible dentro del mismo link.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Pestaña <b>Cómo funciona</b>.</li>
              <li><span className="bullet">2</span> Repite en un vistazo lo que ya viste en esta capacitación.</li>
              <li><span className="bullet">3</span> Vuelve aquí cuando tengas dudas — no hace falta memorizarlo todo hoy.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--black)', flexShrink: 0 }}></div>
                  <div className="mk-line" style={{ width: '80%' }}></div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--black)', flexShrink: 0 }}></div>
                  <div className="mk-line" style={{ width: '70%' }}></div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--black)', flexShrink: 0 }}></div>
                  <div className="mk-line" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 7 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">7</div>
            <div className="step-title">
              <h2>Tu panel personal</h2>
              <p>El historial de todos los clientes que has referido, en un solo lugar.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Toca <b>Mi panel</b> arriba a la derecha, o en la barra inferior.</li>
              <li><span className="bullet">2</span> Ingresa tu mismo código de acceso.</li>
              <li><span className="bullet">3</span> Verás cuántos clientes has enviado y cuántos tienen inicial disponible.</li>
              <li><span className="bullet">4</span> Busca por nombre para encontrar a un cliente específico.</li>
            </ul>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="mk-card"><div className="mk-line" style={{ width: '60%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '25%', height: 16, background: 'var(--red)' }}></div></div>
                  <div className="mk-card"><div className="mk-line" style={{ width: '60%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '25%', height: 16, background: 'var(--green)' }}></div></div>
                </div>
                <div className="mk-card"><div className="mk-line" style={{ width: '50%', marginBottom: 6 }}></div><div className="mk-line" style={{ width: '35%' }}></div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Paso 8 */}
        <div className="step">
          <div className="step-head">
            <div className="step-num">8</div>
            <div className="step-title">
              <h2>Barra de accesos rápidos</h2>
              <p>Cuatro atajos abajo del todo para moverte rápido por el link.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> <b>🚗 Catálogo</b> — vuelve a la lista de vehículos.</li>
              <li><span className="bullet">2</span> <b>🛡️ Plan $500</b> — salta directo al plan de reserva.</li>
              <li><span className="bullet">3</span> <b>💬 Objeciones</b> — abre la guía de respuestas.</li>
              <li><span className="bullet">4</span> <b>👤 Mi panel</b> — entra a tu historial personal.</li>
            </ul>
            <div className="mock">
              <div className="mock-body" style={{ padding: 0, minHeight: 'auto' }}>
                <div style={{ display: 'flex' }}>
                  <span className="mk-btn dark" style={{ flex: 1, borderRadius: 0, padding: '14px 0' }}>🚗</span>
                  <span className="mk-btn red" style={{ flex: 1, borderRadius: 0, padding: '14px 0' }}>🛡️</span>
                  <span className="mk-btn" style={{ background: '#a16207', flex: 1, borderRadius: 0, padding: '14px 0' }}>💬</span>
                  <span className="mk-btn indigo" style={{ flex: 1, borderRadius: 0, padding: '14px 0' }}>👤</span>
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
              <h2>Buenas prácticas para vender más</h2>
              <p>Lo que marca la diferencia entre un buen aliado y uno excelente.</p>
            </div>
          </div>
          <div className="step-body">
            <ul className="instructions">
              <li><span className="bullet">1</span> Presenta el Plan $500 siempre como primera opción — baja la barrera de entrada.</li>
              <li><span className="bullet">2</span> Pregúntale al cliente si tiene inicial disponible antes de enviar — acelera el cierre.</li>
              <li><span className="bullet">3</span> Revisa tu panel semanalmente para ver el estado de tus referidos.</li>
              <li><span className="bullet">4</span> Usa el manejo de objeciones ANTES de que el cliente pregunte, no después.</li>
            </ul>
            <div className="tip green"><span>🚀</span><span>Entre más clientes envíes con datos completos (nombre, teléfono, inicial), más rápido te contacta el equipo de JetPlus para cerrar.</span></div>
            <div className="mock">
              <div className="mock-bar"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
              <div className="mock-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: 34 }}>🤝</span>
                <span className="mk-line" style={{ width: 120 }}></span>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <span>JETPLUS — Red de aliados</span>
          <span>Material de capacitación · No compartir el código de acceso</span>
        </footer>

      </div>
    </div>
  )
}
