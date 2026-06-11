export const metadata = {
  title: 'Vehículos MG & MAXUS — La Oriental Automotors',
  description: 'Explora precios base y planes de financiamiento para vehículos MG y MAXUS en Maturín, Venezuela.',
}

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F2F2F2 !important; color: #111827; font-family: 'Inter', system-ui, sans-serif; }

        /* Glass card */
        .lo-glass {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 24px rgba(0,0,0,.06);
          border-radius: 24px;
        }

        /* Hairline dorada */
        .lo-hairline {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(161,98,7,0.5), transparent);
        }

        /* Location badge */
        .lo-location {
          background: linear-gradient(135deg, #fefce8, #fef9c3);
          border: 1px solid rgba(234,179,8,0.35);
          border-radius: 16px;
          padding: 8px 12px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Brand logos container */
        .lo-brand-pill {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 16px;
          padding: 8px 12px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Online dot */
        .lo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
          animation: pulse-lo 2s ease-in-out infinite;
        }
        @keyframes pulse-lo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }

        /* Buttons */
        .lo-btn-gold {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          background: #eab308; color: #000; font-weight: 800;
          padding: 12px 22px; border-radius: 16px; text-decoration: none;
          transition: opacity .15s; font-size: 14px;
        }
        .lo-btn-gold:hover { opacity: .9; }

        .lo-btn-glass {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          background: #f9fafb; border: 1px solid #d1d5db; color: #111827; font-weight: 700;
          padding: 12px 22px; border-radius: 16px; text-decoration: none;
          transition: background .15s; font-size: 14px;
        }
        .lo-btn-glass:hover { background: #f3f4f6; }

        .lo-btn-wa {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          background: #22c55e; color: #fff; font-weight: 800;
          padding: 12px 22px; border-radius: 16px; text-decoration: none;
          transition: background .15s; font-size: 14px;
        }
        .lo-btn-wa:hover { background: #16a34a; }

        /* Vehicle cards */
        .lo-car-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 20px;
          overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.06);
          display: flex; flex-direction: column;
          transition: transform .25s, box-shadow .25s;
        }
        .lo-car-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,0,0,.1); }

        .lo-plan-box {
          background: linear-gradient(135deg, #fefce8, #fef9c3);
          border: 1px solid rgba(234,179,8,0.4);
          border-radius: 12px; padding: 12px 14px;
          margin-top: 12px;
        }

        /* Pills */
        .lo-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600;
        }
        .lo-pill-green { background: #dcfce7; color: #15803d; }
        .lo-pill-gray  { background: #f3f4f6; color: #6b7280; }

        /* Filter tabs */
        .lo-filter {
          padding: 8px 20px; border-radius: 999px; font-size: 13px; font-weight: 700;
          cursor: pointer; border: 1.5px solid #d1d5db; background: transparent; color: #6b7280;
          transition: all .15s; font-family: inherit;
        }
        .lo-filter.active { background: #111; border-color: #111; color: #fff; }
        .lo-filter:not(.active):hover { background: #f3f4f6; }

        /* Action buttons inside card */
        .lo-card-wa {
          flex: 1; padding: 11px; background: #111; color: #fff; border: none;
          border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer;
          font-family: inherit; text-decoration: none; display: flex;
          align-items: center; justify-content: center; transition: background .15s;
        }
        .lo-card-wa:hover { background: #2a2a2a; }

        .lo-card-share {
          flex: 1; padding: 11px; background: transparent; color: #374151;
          border: 1.5px solid #e5e7eb; border-radius: 12px; font-weight: 600;
          font-size: 13px; cursor: pointer; font-family: inherit; transition: background .15s;
        }
        .lo-card-share:hover { background: #f9fafb; }

        .lo-card-cot {
          width: 100%; padding: 12px; background: #dc2626; color: #fff;
          border: none; border-radius: 12px; font-weight: 700; font-size: 13px;
          cursor: pointer; font-family: inherit; text-decoration: none;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: background .15s;
        }
        .lo-card-cot:hover { background: #b91c1c; }

        /* AC500 cards */
        .lo-ac-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 20px;
          overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.06);
          display: flex; flex-direction: column;
          transition: transform .3s, box-shadow .3s;
        }
        .lo-ac-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,.1); }

        .lo-sched-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; gap: 8px;
        }
        .lo-sched-row:last-child { border-bottom: none; }
        .lo-sched-row.reserve { background: #fef9f0; margin: 0 -14px; padding: 6px 14px; border-radius: 8px; }

        .lo-total-strip {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
          padding: 10px 14px; margin-top: 10px;
          display: flex; justify-content: space-between; align-items: center;
        }

        .lo-plan-toggle {
          display: inline-flex; border-radius: 10px; overflow: hidden;
          border: 1px solid #e5e7eb; background: #f3f4f6;
        }
        .lo-plan-toggle button {
          padding: 6px 14px; font-size: 12px; font-weight: 600; border: none;
          background: transparent; color: #6b7280; cursor: pointer; font-family: inherit;
          transition: all .2s;
        }
        .lo-plan-toggle button.active {
          background: #111; color: #fff; border-radius: 8px;
        }
        .lo-plan-toggle button.active.gold {
          background: #ca8a04; color: #fff;
        }

        .lo-color-dot {
          width: 15px; height: 15px; border-radius: 999px;
          border: 1px solid rgba(0,0,0,.18); cursor: pointer; flex-shrink: 0;
          transition: outline-offset .15s;
        }
        .lo-color-dot.active { outline: 2px solid #ca8a04; outline-offset: 2px; }

        .lo-info-box {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px;
          padding: 16px;
        }

        @media (max-width: 640px) {
          .lo-brand-sep { display: none; }
        }
      `}</style>
      {children}
    </>
  )
}
