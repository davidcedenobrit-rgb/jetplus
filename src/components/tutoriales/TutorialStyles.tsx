// Estilos compartidos por los tutoriales ilustrados (/tutorial-vendedores,
// /tutorial-aliados): mockups vectoriales de cada pantalla, con la marca de
// Jetplus. Aislado de VentasStyles.tsx (clases .lo-*) porque este es otro
// sistema visual (documento de capacitación, no el link de ventas en sí).
export default function TutorialStyles() {
  return (
    <style>{`
      .tut :root, .tut {
        --bg: #f7f5f2;
        --paper: #ffffff;
        --ink: #1c1a17;
        --ink-dim: #6b6355;
        --ink-faint: #9a9182;
        --line: #e6e0d5;
        --red: #C41E3A;
        --red-dark: #9c1830;
        --red-soft: #fbe8ea;
        --black: #111827;
        --gold: #ca8a04;
        --gold-soft: #fef3c7;
        --green: #16a34a;
        --green-soft: #dcfce7;
        --shadow: 0 1px 2px rgba(28,26,23,.05), 0 10px 26px rgba(28,26,23,.07);
      }
      .tut * { box-sizing: border-box; }
      .tut {
        background: var(--bg);
        color: var(--ink);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.55;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
      }
      .tut .serif { font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif; }

      .tut .sheet { max-width: 880px; margin: 0 auto; padding: 0 22px 90px; }

      .tut .cover {
        background: linear-gradient(160deg, var(--black) 0%, #1a1420 55%, var(--red-dark) 130%);
        color: #fff;
        border-radius: 0 0 28px 28px;
        padding: 64px 32px 56px;
        margin-bottom: 48px;
      }
      .tut .cover .eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
        color: #ffd9de; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16);
        padding: 6px 14px; border-radius: 999px; margin-bottom: 22px;
      }
      .tut .cover h1 {
        font-size: clamp(30px, 5vw, 46px);
        margin: 0 0 12px;
        line-height: 1.08;
        text-wrap: balance;
        max-width: 20ch;
      }
      .tut .cover p { color: rgba(255,255,255,.72); font-size: 15px; max-width: 46ch; margin: 0 0 26px; }
      .tut .cover .meta { display: flex; gap: 22px; flex-wrap: wrap; font-size: 12.5px; color: rgba(255,255,255,.55); }
      .tut .cover .meta b { color: #fff; font-weight: 700; }

      .tut .intro { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 56px; }
      @media (max-width: 640px) { .tut .intro { grid-template-columns: 1fr; } }
      .tut .intro .card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; box-shadow: var(--shadow); }
      .tut .intro .card .n { font-size: 22px; font-weight: 800; color: var(--red); margin-bottom: 4px; }
      .tut .intro .card .l { font-size: 12.5px; color: var(--ink-dim); }

      .tut .step { margin-bottom: 64px; }
      .tut .step-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
      .tut .step-num {
        flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px;
        background: var(--red); color: #fff; font-weight: 800; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
      }
      .tut .step-title h2 { font-size: 21px; margin: 0 0 4px; text-wrap: balance; }
      .tut .step-title p { font-size: 13.5px; color: var(--ink-dim); margin: 0; max-width: 60ch; }

      .tut .step-body { display: grid; grid-template-columns: 1fr 1.15fr; gap: 26px; align-items: start; }
      @media (max-width: 720px) { .tut .step-body { grid-template-columns: 1fr; } }

      .tut .instructions { display: grid; gap: 10px; margin: 0; padding: 0; }
      .tut .instructions li {
        list-style: none; display: flex; gap: 10px; font-size: 14px; color: var(--ink);
        background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px;
      }
      .tut .instructions li .bullet {
        flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--red-soft); color: var(--red);
        font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 1px;
      }
      .tut .tip {
        margin-top: 12px; display: flex; gap: 10px; font-size: 13px; color: #92400e;
        background: var(--gold-soft); border: 1px solid #f3d98a; border-radius: 10px; padding: 11px 14px;
      }
      .tut .tip b { color: #78350f; }
      .tut .tip.green { color: #14532d; background: var(--green-soft); border-color: #86efac; }
      .tut .tip.green b { color: #052e16; }

      .tut .mock { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); overflow: hidden; }
      .tut .mock-bar { background: linear-gradient(135deg, var(--red), var(--red-dark)); padding: 10px 14px; display: flex; align-items: center; gap: 6px; }
      .tut .mock-bar .dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.4); }
      .tut .mock-bar .url { margin-left: 8px; font-size: 10px; color: rgba(255,255,255,.75); font-family: ui-monospace, monospace; }
      .tut .mock-body { padding: 16px; background: #fbfaf8; min-height: 150px; }

      .tut .mk-line { height: 8px; border-radius: 4px; background: #e7e2d8; }
      .tut .mk-card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
      .tut .mk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 800; padding: 8px 12px; border-radius: 8px; color: #fff; }
      .tut .mk-btn.red { background: var(--red); }
      .tut .mk-btn.gold { background: var(--gold); }
      .tut .mk-btn.green { background: var(--green); }
      .tut .mk-btn.dark { background: var(--black); }
      .tut .mk-btn.indigo { background: #4338ca; }
      .tut .mk-btn.ghost { background: #fff; color: var(--ink-dim); border: 1px solid var(--line); }

      .tut .mk-pointer { position: relative; }
      .tut .mk-pointer::after { content: ""; position: absolute; inset: -4px; border: 2px solid var(--gold); border-radius: 10px; animation: tut-pulse 1.8s ease-in-out infinite; }
      @keyframes tut-pulse { 0%,100% { opacity: .7; transform: scale(1); } 50% { opacity: .15; transform: scale(1.08); } }
      @media (prefers-reduced-motion: reduce) { .tut .mk-pointer::after { animation: none; } }

      .tut .badge-num { position: absolute; top: -9px; right: -9px; width: 20px; height: 20px; border-radius: 50%; background: var(--red); color: #fff; font-size: 10.5px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(196,30,58,.4); }

      .tut .kbd {
        display: inline-flex; gap: 4px; font-family: ui-monospace, monospace; font-size: 15px; font-weight: 800;
        background: #fff; border: 1.5px solid var(--line); border-radius: 8px; padding: 8px 14px; letter-spacing: 3px;
      }

      .tut footer { margin-top: 40px; padding-top: 22px; border-top: 1px solid var(--line); font-size: 12px; color: var(--ink-faint); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }

      @media print {
        .tut { background: #fff; }
        .tut .cover { border-radius: 0; }
        .tut .step { page-break-inside: avoid; }
      }
    `}</style>
  )
}
