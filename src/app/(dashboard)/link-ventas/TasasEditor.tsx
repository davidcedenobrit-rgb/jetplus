'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Save, Loader2, CheckCircle2 } from 'lucide-react'

export default function TasasEditor() {
  const [tasaBCV, setTasaBCV] = useState('')
  const [tasaUSDT, setTasaUSDT] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/cotizaciones/config-tasas')
      .then(r => r.json())
      .then((data: { clave: string; valor: number; updated_at: string }[]) => {
        const bcv = data.find(d => d.clave === 'tasa_bcv')
        const usdt = data.find(d => d.clave === 'tasa_usdt')
        if (bcv) setTasaBCV(String(bcv.valor))
        if (usdt) setTasaUSDT(String(usdt.valor))
        const last = [bcv?.updated_at, usdt?.updated_at].filter(Boolean).sort().pop()
        if (last) setUpdatedAt(new Date(last).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  async function guardar() {
    const bcv = parseFloat(tasaBCV)
    const usdt = parseFloat(tasaUSDT)
    if (!bcv || !usdt || isNaN(bcv) || isNaN(usdt) || bcv <= 0 || usdt <= 0) {
      setError('Ingresa valores válidos para ambas tasas'); return
    }
    if (usdt <= bcv) { setError('La tasa USDT debe ser mayor que la tasa BCV'); return }
    setSaving(true); setError(''); setSuccess(false)
    const r = await fetch('/api/cotizaciones/config-tasas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasa_bcv: bcv, tasa_usdt: usdt }),
    })
    if (r.ok) {
      setSuccess(true)
      setUpdatedAt(new Date().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      setTimeout(() => setSuccess(false), 3000)
    } else {
      const d = await r.json(); setError(d.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  const bcvNum = parseFloat(tasaBCV)
  const usdtNum = parseFloat(tasaUSDT)
  const diferencialPct = (bcvNum > 0 && usdtNum > bcvNum) ? ((usdtNum - bcvNum) / bcvNum * 100).toFixed(2) : null

  if (loading) return <div className="card p-8 text-center text-oriental-gray text-sm">Cargando tasas...</div>

  return (
    <div className="card p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-oriental-red rounded-lg flex items-center justify-center flex-shrink-0">
          <ArrowLeftRight size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-oriental-black text-sm">Tasas de cambio</h3>
          <p className="text-xs text-oriental-gray">Para el diferencial cambiario del plan 100% Banco</p>
        </div>
        {updatedAt && <span className="ml-auto text-[10px] text-oriental-gray">Actualizado: {updatedAt}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Tasa BCV (Bs/$)</label>
          <input className="input text-sm font-mono" type="number" min="1" step="0.01"
            value={tasaBCV} onChange={e => { setTasaBCV(e.target.value); setError('') }}
            placeholder="721.35" />
        </div>
        <div>
          <label className="label">Tasa USDT (Bs/$)</label>
          <input className="input text-sm font-mono" type="number" min="1" step="0.01"
            value={tasaUSDT} onChange={e => { setTasaUSDT(e.target.value); setError('') }}
            placeholder="817.05" />
        </div>
      </div>

      {diferencialPct && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-800">
            Diferencial cambiario = (USDT − BCV) / BCV = <strong>{diferencialPct}%</strong>, aplicado sobre el monto financiado del plan 100% Banco. Aplica a todos los carros automáticamente.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <button onClick={guardar} disabled={saving}
        className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Save size={16} />}
        {saving ? 'Guardando...' : success ? '¡Tasas guardadas!' : 'Guardar tasas'}
      </button>
    </div>
  )
}
