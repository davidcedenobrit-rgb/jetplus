'use client'

import Link from 'next/link'

// Navegación inferior del link de vendedores: accesos rápidos a las secciones.
export default function StickyNav({ hasAC500, hasPromos }: { hasAC500: boolean; hasPromos?: boolean }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const btnBase: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none',
    padding: '14px 6px', transition: 'opacity .15s', letterSpacing: '.2px', color: '#fff',
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', boxShadow: '0 -2px 20px rgba(0,0,0,.18)',
    }}>
      <button onClick={() => scrollTo('registro')} style={{ ...btnBase, background: '#0f766e' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        👤 Registrar
      </button>
      <button onClick={() => scrollTo('vehiculos')} style={{ ...btnBase, background: '#111827' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        🚗 Vehículos
      </button>
      {hasAC500 && (
        <button onClick={() => scrollTo('ac500')} style={{ ...btnBase, background: '#C41E3A' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          🛡️ Plan $500
        </button>
      )}
      {hasPromos && (
        <button onClick={() => scrollTo('promociones')} style={{ ...btnBase, background: '#a16207' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          🏷️ Promos
        </button>
      )}
      <Link href="/ventas/panel" style={{ ...btnBase, background: '#4338ca', textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        👩‍💼 Mi panel
      </Link>
    </div>
  )
}
