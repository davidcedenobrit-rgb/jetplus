// Estilos compartidos por los links públicos de venta (/ventas, /redes,
// /aliados): mismas clases lo-* (cartas, botones, badges, cronograma AC500)
// y el mismo fondo de marca. Un solo lugar para no triplicar este bloque.
export default function VentasStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      body { background: #0a0a0a url('/fondo-jetplus.jpg') center center / cover no-repeat fixed !important; color: #111827; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
      @media (max-width:820px){ body{ background-image: url('/fondo-jetplus-movil.jpg') !important; background-attachment: scroll !important; } }

      /* ── Glass / hero card ── */
      .lo-glass { background:#fff; border:1px solid #ececec; box-shadow:0 4px 30px rgba(0,0,0,.05); border-radius:28px; }
      .lo-hairline { height:1px; background:linear-gradient(90deg, transparent, rgba(161,98,7,.45), transparent); }

      .lo-pill-loc { display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#fefce8,#fef3c7); border:1px solid rgba(234,179,8,.3); border-radius:14px; padding:7px 13px; font-size:12.5px; font-weight:600; color:#92400e; }
      .lo-pill-online { display:inline-flex; align-items:center; gap:7px; background:#f0fdf4; border:1px solid rgba(34,197,94,.25); border-radius:14px; padding:7px 13px; font-size:12.5px; font-weight:600; color:#15803d; }
      .lo-brand-pill { display:inline-flex; align-items:center; gap:9px; border:1px solid #ececec; background:#fafafa; border-radius:14px; padding:8px 13px; }

      .lo-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; flex-shrink:0; animation:pulse-lo 2s ease-in-out infinite; }
      @keyframes pulse-lo { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.45)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }

      /* ── Buttons ── */
      .lo-btn-gold { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#eab308,#ca8a04); color:#000; font-weight:800; padding:13px 26px; border-radius:14px; text-decoration:none; font-size:14px; box-shadow:0 8px 28px rgba(234,179,8,.22); transition:transform .2s, box-shadow .2s; border:none; cursor:pointer; font-family:inherit; }
      .lo-btn-gold:hover { transform:translateY(-2px); box-shadow:0 12px 38px rgba(234,179,8,.32); }
      .lo-btn-wa { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#22c55e; color:#fff; font-weight:800; padding:13px 26px; border-radius:14px; text-decoration:none; font-size:14px; transition:background .15s; border:none; cursor:pointer; font-family:inherit; }
      .lo-btn-wa:hover { background:#16a34a; }
      .lo-btn-glass { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#fff; border:1px solid #d4d4d4; color:#111827; font-weight:700; padding:13px 24px; border-radius:14px; text-decoration:none; font-size:14px; transition:background .15s; cursor:pointer; font-family:inherit; }
      .lo-btn-glass:hover { background:#f5f5f5; }

      /* ── Filter tabs ── */
      .f-btn { padding:8px 22px; border-radius:22px; font-size:13px; font-weight:600; cursor:pointer; border:1.5px solid #d1d5db; background:transparent; color:#6b7280; transition:all .2s; font-family:inherit; }
      .f-btn:hover { background:#f3f4f6; }
      .f-btn.on { background:#111; border-color:#111; color:#fff; font-weight:700; }

      /* ── Vehicle / AC500 cards ── */
      .lo-card { background:#fff; border:1px solid #ececec; border-radius:24px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.05); display:flex; flex-direction:column; transition:transform .3s ease, box-shadow .3s ease; }
      .lo-card:hover { transform:translateY(-6px); box-shadow:0 18px 44px rgba(0,0,0,.1); }
      .lo-card-imgwrap { width:100%; height:200px; overflow:hidden; background:#fff; display:flex; align-items:center; justify-content:center; position:relative; }
      .lo-card-img { width:100%; height:100%; object-fit:cover; transition:transform .45s ease; }
      .lo-card:hover .lo-card-img { transform:scale(1.05); }

      .lo-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 9px; border-radius:10px; font-size:10px; font-weight:700; }
      .lo-badge-stock { background:#dcfce7; color:#16a34a; }
      .lo-badge-none  { background:#fef2f2; color:#dc2626; }
      .lo-badge-meta  { background:#f1f5f9; color:#475569; }

      .lo-credit-box { background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1px solid rgba(234,179,8,.35); border-radius:16px; padding:14px 16px; }

      .lo-cbtn-dark { width:100%; background:#111; color:#fff; padding:12px; border-radius:12px; font-size:13px; font-weight:600; border:none; cursor:pointer; font-family:inherit; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px; transition:background .15s; }
      .lo-cbtn-dark:hover { background:#2a2a2a; }
      .lo-cbtn-out { width:100%; background:transparent; border:1.5px solid #d1d5db; color:#374151; padding:12px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; text-decoration:none; display:flex; align-items:center; justify-content:center; transition:background .15s; }
      .lo-cbtn-out:hover { background:#f9fafb; }
      .lo-cbtn-red { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 16px; border-radius:14px; background:#dc2626; color:#fff; font-size:14px; font-weight:800; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(220,38,38,.22); font-family:inherit; text-decoration:none; transition:background .15s; }
      .lo-cbtn-red:hover { background:#b91c1c; }

      /* ── AC500 cronograma ── */
      .sched-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f3f4f6; font-size:13px; gap:10px; }
      .sched-row:last-child { border-bottom:none; }
      .sched-row .sr-label { color:#6b7280; }
      .sched-row .sr-val { font-weight:700; color:#111; text-align:right; white-space:nowrap; }
      .sched-row.highlight { background:#fef9f0; margin:0 -14px; padding:6px 14px; border-radius:8px; }
      .sched-row.highlight .sr-label { color:#a16207; font-weight:600; }
      .sched-row.highlight .sr-val { color:#ca8a04; }

      .total-strip { display:flex; justify-content:space-between; align-items:center; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:10px 14px; margin-top:10px; gap:10px; }
      .total-strip .ts-label { font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.6px; }
      .total-strip .ts-val { font-size:18px; font-weight:800; color:#15803d; text-align:right; white-space:nowrap; }

      .plan-toggle { display:inline-flex; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; background:#f3f4f6; padding:2px; }
      .plan-toggle button { padding:6px 14px; font-size:12px; font-weight:600; border:none; background:transparent; color:#6b7280; cursor:pointer; font-family:inherit; transition:all .2s; border-radius:8px; }
      .plan-toggle button.active { background:#111; color:#fff; }
      .plan-toggle button.active.gold { background:#ca8a04; color:#fff; }

      .mini-note { display:inline-block; margin-top:6px; font-size:11px; font-weight:700; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; padding:4px 9px; border-radius:999px; }

      .lo-cdot { width:16px; height:16px; border-radius:999px; border:1px solid rgba(0,0,0,.18); cursor:pointer; flex-shrink:0; transition:outline-offset .15s; }
      .lo-cdot.active { outline:2px solid #ca8a04; outline-offset:2px; }

      .lo-info-box { background:#fafafa; border:1px solid #ececec; border-radius:18px; padding:18px; }
      .lo-perk { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; padding:9px 16px; border-radius:40px; font-size:12px; font-weight:600; color:#444; }

      @media (max-width:640px){ .lo-brand-sep{display:none} }

      /* ── Responsive móvil ── */
      @media (max-width:820px){
        /* Hero: apilar en una sola columna (el grid va en estilo inline, por eso !important) */
        .lo-hero-grid{ grid-template-columns:1fr !important; }
        .lo-hero-right{ min-width:0 !important; max-width:none !important; width:100% !important; }
        .lo-hero-grid > .lo-glass{ padding:26px 22px !important; }
      }
      @media (max-width:480px){
        .lo-hero-grid > .lo-glass{ padding:22px 18px !important; border-radius:22px; }
        /* Botones del hero a ancho completo para que no se corten */
        .lo-btn-gold, .lo-btn-glass, .lo-btn-wa{ flex:1 1 100%; }
      }

      /* ── Encabezado de asesor (tarjeta NFC/QR personalizada) ── */
      @media (max-width:640px){
        .lo-asesor-header{ flex-direction:column !important; text-align:center !important; justify-content:center !important; }
        .lo-asesor-header > div{ justify-content:center !important; text-align:center !important; }
        .lo-asesor-direccion{ text-align:center !important; }
      }

      /* ── Tabs internos (aliados) ── */
      .lo-tab { padding:10px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; border:1.5px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); color:rgba(255,255,255,.75); transition:all .2s; font-family:inherit; white-space:nowrap; }
      .lo-tab:hover { background:rgba(255,255,255,.12); }
      .lo-tab.on { background:#ca8a04; border-color:#ca8a04; color:#fff; }
    `}</style>
  )
}
