export const metadata = {
  title: 'Vehículos MG & MAXUS — La Oriental Automotors',
  description: 'Explora precios base y planes de financiamiento para vehículos MG y MAXUS en Maturín, Venezuela. La Oriental Automotors.',
}

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body {
          background-color: #0f0f0f !important;
          color: #ffffff;
        }
        .v-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; transition: border-color 0.2s; }
        .v-card:hover { border-color: rgba(255,255,255,0.15); }
        .v-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 8px 0; }
        .v-tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .v-tag-mg { background: rgba(220,38,38,0.85); color: #fff; }
        .v-tag-maxus { background: rgba(37,99,235,0.85); color: #fff; }
        .v-btn-wa { display: block; width: 100%; padding: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; text-align: center; cursor: pointer; transition: background 0.15s, color 0.15s; text-decoration: none; }
        .v-btn-wa:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .v-btn-red { display: inline-block; padding: 12px 24px; background: #dc2626; color: #fff; font-weight: 700; border-radius: 12px; cursor: pointer; transition: background 0.15s; text-decoration: none; font-size: 15px; }
        .v-btn-red:hover { background: #b91c1c; }
        .v-btn-ghost { display: inline-block; padding: 12px 24px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); font-weight: 700; border-radius: 12px; cursor: pointer; transition: background 0.15s; text-decoration: none; font-size: 15px; }
        .v-btn-ghost:hover { background: rgba(255,255,255,0.14); color: #fff; }
        .v-filter { padding: 8px 20px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: background 0.15s, color 0.15s; }
        .v-filter.active { background: #dc2626; color: #fff; }
        .v-filter:not(.active) { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.55); }
        .v-filter:not(.active):hover { background: rgba(255,255,255,0.14); color: #fff; }
        .topbar-link { color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none; transition: color 0.15s; }
        .topbar-link:hover { color: #fff; }
        .scroll-top { position: fixed; bottom: 20px; right: 20px; width: 40px; height: 40px; background: #dc2626; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; z-index: 99; }
      `}</style>
      {children}
    </>
  )
}
