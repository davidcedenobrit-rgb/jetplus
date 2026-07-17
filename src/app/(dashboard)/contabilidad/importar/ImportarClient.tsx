'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react'
import type { Simulacion, Advertencia } from '@/lib/contabilidad/plan-cuentas'
import { aplicarImportacion } from '../actions'

const TIPO_LABEL: Record<Advertencia['tipo'], { label: string; clase: string }> = {
  huerfana:    { label: 'Huérfana',   clase: 'bg-red-50 text-red-700' },
  naturaleza:  { label: 'Naturaleza', clase: 'bg-amber-50 text-amber-700' },
  normalizado: { label: 'Código',     clase: 'bg-blue-50 text-blue-700' },
  duplicado:   { label: 'Duplicado',  clase: 'bg-purple-50 text-purple-700' },
}

export default function ImportarClient({ sim }: { sim: Simulacion }) {
  const [confirmar, setConfirmar] = useState(false)
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  const conteos = sim.advertencias.reduce<Record<string, number>>((acc, a) => {
    acc[a.tipo] = (acc[a.tipo] ?? 0) + 1
    return acc
  }, {})

  async function ejecutar() {
    setCargando(true)
    setResultado(null)
    const r = await aplicarImportacion(texto.trim().toUpperCase())
    setResultado(r)
    setCargando(false)
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contabilidad" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Importar catálogo — Simulación</h1>
          <p className="text-oriental-gray text-sm mt-0.5">{sim.fuente}</p>
        </div>
      </div>

      {/* Resumen simulación */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Box label="Se importarían" value={sim.total} sub={`${sim.importadas} + ${sim.propuestas} propuestas`} />
        <Box label="De movimiento" value={sim.movimiento} sub={`${sim.titulos} de título`} />
        <Box label="Debe / Haber" value={`${sim.naturalezaDebe}/${sim.naturalezaHaber}`} />
        <Box label="Advertencias" value={sim.advertencias.length} alerta />
      </div>

      {/* Desglose de advertencias */}
      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-3 bg-oriental-bg border-b border-gray-200 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-oriental-black">Advertencias a validar ({sim.advertencias.length})</h2>
          <div className="flex gap-1.5 ml-auto flex-wrap">
            {Object.entries(conteos).map(([t, n]) => (
              <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_LABEL[t as Advertencia['tipo']].clase}`}>
                {TIPO_LABEL[t as Advertencia['tipo']].label}: {n}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Código</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Cuenta</th>
                <th className="text-left px-3 py-2 font-medium text-oriental-gray text-xs">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sim.advertencias.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${TIPO_LABEL[a.tipo].clase}`}>{TIPO_LABEL[a.tipo].label}</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-oriental-black whitespace-nowrap">{a.codigo}</td>
                  <td className="px-3 py-1.5 text-oriental-black">{a.nombre}</td>
                  <td className="px-3 py-1.5 text-xs text-oriental-gray">{a.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aplicar (con guardas) */}
      <div className="card p-5 border-2 border-oriental-red/20">
        <div className="flex items-start gap-3 mb-4">
          <ShieldAlert size={20} className="text-oriental-red flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-oriental-black">Aplicar la importación a la base de datos</h2>
            <p className="text-sm text-oriental-gray mt-1">
              Esto escribe el catálogo en el sistema (versión en estado <b>borrador</b>, sin activar). Hazlo <b>solo con la aprobación de la contadora</b> y
              después de aplicar la migración <code>027_contabilidad_base.sql</code>. Es idempotente: no duplica si la versión ya existe.
            </p>
          </div>
        </div>

        {resultado && (
          <div className={`mb-4 rounded-lg p-3 text-sm flex items-start gap-2 ${resultado.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        <label className="flex items-center gap-2 mb-3 text-sm text-oriental-black">
          <input type="checkbox" checked={confirmar} onChange={e => setConfirmar(e.target.checked)} className="w-4 h-4" />
          Confirmo que la contadora aprobó importar esta versión del catálogo.
        </label>

        {confirmar && (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder='Escribe "IMPORTAR" para confirmar'
              className="input w-64"
            />
            <button
              onClick={ejecutar}
              disabled={cargando || texto.trim().toUpperCase() !== 'IMPORTAR'}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {cargando ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Aplicar importación
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Box({ label, value, sub, alerta }: { label: string; value: string | number; sub?: string; alerta?: boolean }) {
  return (
    <div className={`card p-4 ${alerta && Number(value) > 0 ? 'border-amber-200 bg-amber-50/40' : ''}`}>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-oriental-gray">{label}</p>
      <p className="text-2xl font-black text-oriental-black">{value}</p>
      {sub && <p className="text-[11px] text-oriental-gray mt-0.5">{sub}</p>}
    </div>
  )
}
