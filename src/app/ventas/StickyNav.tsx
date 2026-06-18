'use client'

const WA_FICHAS = encodeURIComponent('Hola 👋 Vengo de la web de La Oriental y quiero que me envíen las fichas técnicas de los vehículos MG y MAXUS disponibles.')

export default function StickyNav({ hasAC500 }: { hasAC500: boolean }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const btnBase: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
    padding: '14px 8px', transition: 'opacity .15s', letterSpacing: '.2px',
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', boxShadow: '0 -2px 20px rgba(0,0,0,.18)',
    }}>
      <button
        onClick={() => scrollTo('vehiculos')}
        style={{ ...btnBase, background: '#111827', color: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        🚗 Showroom Maturín
      </button>

      {hasAC500 && (
        <button
          onClick={() => scrollTo('ac500')}
          style={{ ...btnBase, background: '#C41E3A', color: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          🛡️ Plan $500
        </button>
      )}

      <a
        href={`https://wa.me/584149989010?text=${WA_FICHAS}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnBase, background: '#111827', color: '#fff', textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        📋 Fichas Técnicas
      </a>
    </div>
  )
}
