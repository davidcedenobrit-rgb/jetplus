'use client'

import { useState, useEffect } from 'react'
import { Mail, MailCheck, MailX, MailOpen, MousePointerClick, AlertTriangle, Clock, Loader2 } from 'lucide-react'

type Estado = 'sent' | 'delivered' | 'delivery_delayed' | 'bounced' | 'opened' | 'clicked' | 'complained' | 'failed' | null | undefined

interface Props {
  estado: Estado
  ultimoEventoAt?: string | null
  entidadTipo?: string
  entidadId?: string | null
  resendEmailId?: string | null
  size?: 'xs' | 'sm'
  showLabel?: boolean
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any; tooltip: string }> = {
  sent:              { label: 'Enviado',    bg: 'bg-blue-100',   text: 'text-blue-800',   icon: Mail,               tooltip: 'El correo salió de nuestro servidor' },
  delivered:         { label: 'Entregado',  bg: 'bg-green-100',  text: 'text-green-800',  icon: MailCheck,          tooltip: 'Llegó al buzón del destinatario' },
  delivery_delayed:  { label: 'Retrasado',  bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock,              tooltip: 'El servidor destino está tardando' },
  opened:            { label: 'Abierto',    bg: 'bg-purple-100', text: 'text-purple-800', icon: MailOpen,           tooltip: 'El destinatario abrió el correo' },
  clicked:           { label: 'Click',      bg: 'bg-indigo-100', text: 'text-indigo-800', icon: MousePointerClick,  tooltip: 'El destinatario hizo click en un enlace' },
  bounced:           { label: 'Rebotó',     bg: 'bg-red-100',    text: 'text-red-800',    icon: MailX,              tooltip: 'El correo no se pudo entregar' },
  complained:        { label: 'Spam',       bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertTriangle,      tooltip: 'El destinatario lo marcó como spam' },
  failed:            { label: 'Falló',      bg: 'bg-red-100',    text: 'text-red-800',    icon: MailX,              tooltip: 'El envío falló' },
}

function fmtHora(iso: string | null | undefined) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function EmailTrackingBadge({
  estado, ultimoEventoAt, entidadTipo, entidadId, resendEmailId, size = 'xs', showLabel = true,
}: Props) {
  const [openDetalle, setOpenDetalle] = useState(false)

  if (!estado) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'} bg-gray-100 text-gray-500`}>
        <Mail size={size === 'sm' ? 12 : 10} />
        Sin correo
      </span>
    )
  }

  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.sent
  const Icon = cfg.icon
  const iconSize = size === 'sm' ? 12 : 10
  const canShowDetail = !!(resendEmailId && entidadTipo)

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); if (canShowDetail) setOpenDetalle(true) }}
        title={`${cfg.tooltip}${ultimoEventoAt ? ` · ${fmtHora(ultimoEventoAt)}` : ''}`}
        className={`inline-flex items-center gap-1 rounded-full ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'} font-semibold ${cfg.bg} ${cfg.text} ${canShowDetail ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'}`}
      >
        <Icon size={iconSize} />
        {showLabel && cfg.label}
      </button>

      {openDetalle && canShowDetail && (
        <EmailTrackingDetalle
          resendEmailId={resendEmailId!}
          entidadTipo={entidadTipo!}
          entidadId={entidadId ?? null}
          onClose={() => setOpenDetalle(false)}
        />
      )}
    </>
  )
}

function EmailTrackingDetalle({ resendEmailId, onClose }: { resendEmailId: string; entidadTipo: string; entidadId: string | null; onClose: () => void }) {
  const [eventos, setEventos] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams({ resend_email_id: resendEmailId })
        const r = await fetch(`/api/email-tracking?${params}`)
        if (!r.ok) throw new Error('No se pudo cargar el historial')
        const j = await r.json()
        if (!cancelled) setEventos(j.eventos ?? [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [resendEmailId])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-oriental-black">Tracking del correo</p>
            <p className="text-[11px] text-oriental-gray font-mono">{resendEmailId.slice(0, 24)}…</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5">
          {loading && (
            <div className="flex items-center gap-2 text-oriental-gray text-sm">
              <Loader2 size={14} className="animate-spin" /> Cargando historial…
            </div>
          )}
          {error && (
            <p className="text-sm text-red-700">{error}</p>
          )}
          {eventos && eventos.length === 0 && (
            <p className="text-sm text-oriental-gray">Sin eventos registrados aún.</p>
          )}
          {eventos && eventos.length > 0 && (
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-200" />
              {eventos.map((ev, i) => {
                const cfg = ESTADO_CONFIG[ev.evento] ?? ESTADO_CONFIG.sent
                const Icon = cfg.icon
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[13px] top-1 w-3 h-3 rounded-full ${cfg.bg} border-2 border-white`} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} className={cfg.text} />
                        <p className="text-sm font-semibold text-oriental-black">{cfg.label}</p>
                      </div>
                      <span className="text-[11px] text-oriental-gray">{fmtHora(ev.event_timestamp ?? ev.created_at)}</span>
                    </div>
                    {ev.metadata?.bounce?.reason && (
                      <p className="text-[11px] text-red-700 mt-1">Razón: {String(ev.metadata.bounce.reason)}</p>
                    )}
                    {ev.metadata?.click?.link && (
                      <p className="text-[11px] text-indigo-700 mt-1 truncate">Link: {String(ev.metadata.click.link)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
