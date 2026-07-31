'use client'

import { useEffect, useRef, useState } from 'react'
import { Lock, Unlock, Mic, ShieldCheck, Vault } from 'lucide-react'

type Ingreso = { id: string; fecha: string; monto: number; origen: string; detalle: string; cliente: string }

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (s: string) => { try { return new Date(s).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return s } }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function BovedaPanel({ ingresos, total }: { ingresos: Ingreso[]; total: number }) {
  const [abierta, setAbierta] = useState(false)
  const [vozOk, setVozOk] = useState(false)         // comando de voz reconocido → pedir clave
  const [escuchando, setEscuchando] = useState(false)
  const [error, setError] = useState('')
  const [clave, setClave] = useState('')
  const [verificando, setVerificando] = useState(false)
  const recRef = useRef<any>(null)

  useEffect(() => () => { try { recRef.current?.stop() } catch { /* noop */ } }, [])

  function escuchar() {
    setError('')
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError('Tu navegador no soporta comando de voz. Usa Chrome.'); return }
    const rec = new SR()
    rec.lang = 'es-VE'; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 3
    recRef.current = rec
    setEscuchando(true)
    rec.onresult = (ev: any) => {
      let dijo = ''
      for (let i = 0; i < ev.results.length; i++) {
        for (let j = 0; j < ev.results[i].length; j++) dijo += ' ' + ev.results[i][j].transcript
      }
      const t = norm(dijo)
      if ((t.includes('abrir') && t.includes('boveda')) || t.includes('abre la boveda') || t.includes('abrir boveda')) {
        setVozOk(true); setError('')
      } else {
        setError('Comando no reconocido. Di: «abrir la bóveda».')
      }
    }
    rec.onerror = (e: any) => { setError(e?.error === 'not-allowed' ? 'Permiso de micrófono denegado.' : 'No se pudo escuchar, intenta de nuevo.'); setEscuchando(false) }
    rec.onend = () => setEscuchando(false)
    try { rec.start() } catch { setError('No se pudo iniciar el micrófono.'); setEscuchando(false) }
  }

  async function verificarClave() {
    if (!clave.trim()) { setError('Escribe la clave.'); return }
    setVerificando(true); setError('')
    try {
      const r = await fetch('/api/boveda/verificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.ok) { setAbierta(true); setClave('') }
      else setError('Clave incorrecta.')
    } catch {
      setError('No se pudo verificar la clave.')
    } finally { setVerificando(false) }
  }

  function cerrar() { setAbierta(false); setVozOk(false); setClave(''); setError('') }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oriental-black flex items-center gap-2"><ShieldCheck size={22} className="text-oriental-red" /> Seguridad</h1>
        <p className="text-oriental-gray text-sm mt-1">Acceso reservado a la Dirección</p>
      </div>

      {!abierta ? (
        <div className="rounded-2xl bg-oriental-black text-white p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #C41E3A 0, transparent 45%)' }} />
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
              <Lock size={34} className="text-white" />
            </div>
            <h2 className="text-xl font-bold flex items-center justify-center gap-2"><Vault size={20} /> Bóveda</h2>
            <p className="text-gray-300 text-sm mt-1 mb-6">Ingresos reservados de la directiva. {vozOk ? 'Ahora ingresa la clave secreta.' : 'Pronuncia el comando y luego ingresa la clave.'}</p>

            {!vozOk ? (
              <>
                <button onClick={escuchar} disabled={escuchando}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-oriental-red hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                  <Mic size={18} className={escuchando ? 'animate-pulse' : ''} /> {escuchando ? 'Escuchando…' : 'Abrir con comando de voz'}
                </button>
                {error && <p className="text-[12px] text-red-300 mt-3">{error}</p>}
                {error && (
                  <button onClick={() => { setError(''); setVozOk(true) }}
                    className="block mx-auto text-[11px] text-gray-300 mt-3 underline hover:text-white">
                    El micrófono no funciona — continuar solo con la clave
                  </button>
                )}
                <p className="text-[11px] text-gray-500 mt-5">Paso 1 de 2</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-[12px] text-green-300 mb-3">
                  <Mic size={14} /> Comando reconocido ✓
                </div>
                <form onSubmit={e => { e.preventDefault(); verificarClave() }} className="flex flex-col items-center gap-3">
                  <input value={clave} onChange={e => setClave(e.target.value)} type="password" inputMode="numeric"
                    autoFocus placeholder="Clave secreta" autoComplete="off"
                    className="w-48 text-center tracking-[0.4em] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-oriental-red" />
                  <button type="submit" disabled={verificando}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-oriental-red hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                    <Unlock size={16} /> {verificando ? 'Verificando…' : 'Abrir bóveda'}
                  </button>
                </form>
                {error && <p className="text-[12px] text-red-300 mt-3">{error}</p>}
                <button onClick={cerrar} className="text-[11px] text-gray-400 mt-4 hover:text-gray-200 underline">Cancelar</button>
                <p className="text-[11px] text-gray-500 mt-3">Paso 2 de 2 · Clave secreta</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="rounded-2xl bg-gradient-to-br from-oriental-black to-gray-800 text-white p-6 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2"><Unlock size={14} /> Bóveda abierta</p>
              <p className="text-3xl font-bold mt-1">${fmt(total)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Total acumulado en bóveda ({ingresos.length} movimiento{ingresos.length === 1 ? '' : 's'})</p>
            </div>
            <Vault size={48} className="text-oriental-red" />
          </div>

          {ingresos.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Aún no hay ingresos registrados en la bóveda.</p>
          ) : (
            <div className="space-y-2">
              {ingresos.map(i => (
                <div key={i.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-oriental-black truncate">{i.detalle || 'Venta'} <span className="text-gray-400 font-normal">· {i.cliente}</span></p>
                    <p className="text-[11px] text-gray-500">{i.origen} · {fmtFecha(i.fecha)}</p>
                  </div>
                  <p className="text-sm font-bold text-green-700 shrink-0">${fmt(i.monto)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-right">
            <button onClick={cerrar} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Lock size={14} /> Cerrar bóveda
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
