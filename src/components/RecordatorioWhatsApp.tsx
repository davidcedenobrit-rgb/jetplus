'use client'

import { useState } from 'react'
import { MessageCircle, Copy, ExternalLink, X, Check } from 'lucide-react'
import { registrarAvisoCobro } from '@/app/actions/cobranza'

interface CuotaVencida {
  vehiculoLabel: string
  numeroCuota: number
  fechaVencimiento: string
  saldo: number
  mora: number
  moneda: string
  esParcial: boolean
}

interface CuotaProxima {
  vehiculoLabel: string
  numeroCuota: number
  fechaVencimiento: string
  saldo: number
  moneda: string
}

interface Props {
  clienteId: string
  clienteNombre: string
  whatsapp: string
  cuotasVencidas: CuotaVencida[]
  cuotasProximas: CuotaProxima[]
  origen: 'panel_cliente' | 'panel_credito' | 'reporte_cobranza'
}

function fmtMonto(monto: number, moneda: string) {
  return `${moneda !== 'VES' ? '$' : 'Bs.'}${monto.toLocaleString('es-VE', { minimumFractionDigits: Math.round(Math.abs(monto)*100)%100===0?0:2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtFechaCorta(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function limpiarNumero(num: string) {
  const solo = num.replace(/\D/g, '')
  if (solo.startsWith('58')) return solo
  if (solo.startsWith('0')) return '58' + solo.slice(1)
  return '58' + solo
}

export default function RecordatorioWhatsApp({
  clienteId,
  clienteNombre,
  whatsapp,
  cuotasVencidas,
  cuotasProximas,
  origen,
}: Props) {
  const [open, setOpen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [registrado, setRegistrado] = useState(false)

  const nombre = clienteNombre.split(' ')[0]

  const lineas: string[] = []
  lineas.push(`Hola ${nombre} 👋`)
  lineas.push('')
  lineas.push(`Te escribe el *Departamento de Cobranza y Jurídico* de *JETPLUS*. Queremos recordarte que tienes cuotas pendientes con nosotros:`)
  lineas.push('')

  const monedaTotal = cuotasVencidas[0]?.moneda ?? cuotasProximas[0]?.moneda ?? 'USD'
  const totalVencido = cuotasVencidas.reduce((s, c) => s + c.saldo + c.mora, 0)
  const totalProximo = cuotasProximas.reduce((s, c) => s + c.saldo, 0)
  const totalGeneral = totalVencido + totalProximo

  if (cuotasVencidas.length > 0) {
    lineas.push(`🔴 *Cuotas vencidas:*`)
    cuotasVencidas.forEach(c => {
      const etiqueta = c.esParcial ? '(saldo parcial)' : ''
      const moraStr = c.mora > 0 ? ` + mora ${fmtMonto(c.mora, c.moneda)}` : ''
      lineas.push(`• ${c.vehiculoLabel} — Cuota N° ${c.numeroCuota}${etiqueta ? ` ${etiqueta}` : ''}: *${fmtMonto(c.saldo + c.mora, c.moneda)}*${moraStr ? ` _${moraStr.trim()}_` : ''} (venció ${fmtFechaCorta(c.fechaVencimiento)})`)
    })
    lineas.push('')
  }

  if (cuotasProximas.length > 0) {
    lineas.push(`🟡 *Por vencer:*`)
    cuotasProximas.forEach(c => {
      lineas.push(`• ${c.vehiculoLabel} — Cuota N° ${c.numeroCuota}: *${fmtMonto(c.saldo, c.moneda)}* (vence ${fmtFecha(c.fechaVencimiento)})`)
    })
    lineas.push('')
  }

  lineas.push(`*Total pendiente: ${fmtMonto(totalGeneral, monedaTotal)}*`)
  lineas.push('')
  lineas.push(`Por favor coordina tu pago a la brevedad posible. Estamos a tu disposición para cualquier consulta. 🙏`)
  lineas.push('')
  lineas.push(`_Departamento de Cobranza y Jurídico · JETPLUS · MG & Maxus · Porlamar_`)

  const mensaje = lineas.join('\n')
  const numero  = limpiarNumero(whatsapp)
  // wa.me detecta el dispositivo (abre la app en móvil y la web en escritorio);
  // web.whatsapp.com se traba en el teléfono.
  const waUrl   = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`

  const totalUsdAprox =
    cuotasVencidas.filter(c => c.moneda !== 'VES').reduce((s, c) => s + c.saldo + c.mora, 0) +
    cuotasProximas.filter(c => c.moneda !== 'VES').reduce((s, c) => s + c.saldo, 0)

  async function registrarEnBitacora() {
    if (registrado) return
    await registrarAvisoCobro({
      clienteId,
      origen,
      whatsappDestino: whatsapp,
      cuotasVencidasCant: cuotasVencidas.length,
      cuotasProximasCant: cuotasProximas.length,
      montoTotalUsd: totalUsdAprox > 0 ? totalUsdAprox : null,
      resumen: mensaje.slice(0, 1000),
    })
    setRegistrado(true)
  }

  async function copiar() {
    await navigator.clipboard.writeText(mensaje)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
    registrarEnBitacora()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
      >
        <MessageCircle size={16} />
        Aviso de cobro
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-green-600" />
                <div>
                  <p className="font-bold text-oriental-black">Aviso de cobro</p>
                  <p className="text-[11px] text-oriental-gray">Dpto. Cobranza y Jurídico · Jetplus</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-oriental-gray" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs text-oriental-gray font-semibold uppercase tracking-wider mb-2">
                Mensaje para {clienteNombre}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <pre className="text-sm text-oriental-black whitespace-pre-wrap font-sans leading-relaxed">
                  {mensaje}
                </pre>
              </div>
              <p className="text-xs text-oriental-gray mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                Se enviará al número: <span className="font-mono font-bold">{whatsapp}</span>
              </p>
              {registrado && (
                <p className="text-[11px] text-green-700 mt-2 flex items-center gap-1.5">
                  <Check size={12} /> Registrado en bitácora
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registrarEnBitacora}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors"
              >
                <ExternalLink size={16} />
                Abrir en WhatsApp
              </a>
              <button
                onClick={copiar}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-oriental-black text-sm font-semibold transition-colors"
              >
                {copiado ? <><Check size={16} className="text-green-600" /> Copiado</> : <><Copy size={16} /> Copiar mensaje</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
