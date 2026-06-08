'use client'

import { useState } from 'react'
import { Mail, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react'

const ROL_PERMITIDO = ['jose', 'admin', 'director', 'mary', 'leysdem']

interface Props {
  ingresoId: string
  clienteNombre: string
  clienteCorreo: string | null
  clienteTelefono: string | null
  numeroRecibo: string
  monto: number
  moneda: string
  concepto: string
  fechaPago: string
  metodoPago: string
  referencia: string | null
  rol: string
}

function formatPhoneWA(telefono: string): string {
  const digits = telefono.replace(/\D/g, '')
  if (digits.startsWith('0')) return '58' + digits.slice(1)
  if (digits.startsWith('58')) return digits
  return '58' + digits
}

export default function ClienteContactButtons({
  ingresoId, clienteNombre, clienteCorreo, clienteTelefono,
  numeroRecibo, monto, moneda, concepto, fechaPago, metodoPago, referencia, rol,
}: Props) {
  const [emailSent, setEmailSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!ROL_PERMITIDO.includes(rol)) return null

  const montoFmt = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(monto)
  const monedaLabel = moneda === 'VES' ? 'Bs.' : moneda

  const fechaLegible = (() => {
    try {
      return new Date(fechaPago + 'T12:00:00').toLocaleDateString('es-VE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return fechaPago }
  })()

  const waText = encodeURIComponent(
    `Estimado/a ${clienteNombre},\n\n` +
    `Le confirmamos la recepción de su pago:\n\n` +
    `📋 N° Recibo: ${numeroRecibo}\n` +
    `💼 Concepto: ${concepto}\n` +
    `💰 Monto: ${monedaLabel} ${montoFmt}\n` +
    `📅 Fecha: ${fechaLegible}\n` +
    `💳 Método: ${metodoPago}\n` +
    (referencia ? `🔢 Referencia: ${referencia}\n` : '') +
    `\nGracias por su preferencia.\nLa Oriental Automotors`
  )

  async function handleEmail() {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/ingresos/enviar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingresoId }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(msg ?? 'Error al enviar el correo')
      } else {
        setEmailSent(true)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-oriental-black mb-4">Enviar al cliente</h3>
      <div className="space-y-2">

        {/* Email */}
        <button
          onClick={handleEmail}
          disabled={sending || emailSent || !clienteCorreo}
          title={!clienteCorreo ? 'El cliente no tiene correo registrado' : undefined}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            emailSent
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:cursor-not-allowed'
          }`}
        >
          {emailSent
            ? <CheckCircle2 size={16} />
            : sending
            ? <Loader2 size={16} className="animate-spin" />
            : <Mail size={16} />}
          <span className="flex-1 text-left">
            {emailSent ? 'Correo enviado' : sending ? 'Enviando...' : 'Enviar por correo'}
          </span>
          {!clienteCorreo && !emailSent && (
            <span className="text-[10px] font-normal opacity-60">Sin correo</span>
          )}
        </button>

        {/* WhatsApp */}
        {clienteTelefono ? (
          <a
            href={`https://wa.me/${formatPhoneWA(clienteTelefono)}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors"
          >
            <MessageCircle size={16} />
            Enviar por WhatsApp
          </a>
        ) : (
          <div className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
            <MessageCircle size={16} />
            <span className="flex-1">Enviar por WhatsApp</span>
            <span className="text-[10px] font-normal">Sin teléfono</span>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  )
}
