import { createClient } from '@/lib/supabase/server'
import { sanitizeSearch } from '@/lib/utils'
import Link from 'next/link'
import { Search, FileText, User, ArrowLeft, ClipboardList, Calendar } from 'lucide-react'
import HistorialTimeline from './HistorialTimeline'

type DocumentoTimeline = {
  id: string
  tipo: 'cotizacion' | 'proforma'
  numero: string
  fecha: string
  estado?: string | null
  vehiculoLabel?: string | null
  extraInfo?: string | null
  pdfUrl: string
  detalleUrl?: string | null
  clienteNombre: string
  clienteCiRif: string
  monto?: number | null
  emailUltimoEstado?: string | null
  emailUltimoEventoAt?: string | null
  resendEmailId?: string | null
}

const estadoCotColors: Record<string, string> = {
  aceptada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  sin_respuesta: 'bg-gray-100 text-gray-600',
  pospuesta: 'bg-purple-100 text-purple-700',
  vencida: 'bg-orange-100 text-orange-700',
  reactivada: 'bg-blue-100 text-blue-700',
}

const estadoCotLabel: Record<string, string> = {
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  sin_respuesta: 'Sin respuesta',
  pospuesta: 'Pospuesta',
  vencida: 'Vencida',
  reactivada: 'Reactivada',
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cliente?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const q = params.q ? sanitizeSearch(params.q).slice(0, 80) : ''
  const clienteId = params.cliente ?? null

  // 1) Buscar clientes por texto
  let clientesEncontrados: Array<{ id: string; nombre: string; cedula_rif: string; telefono: string | null }> = []
  if (q && !clienteId) {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, cedula_rif, telefono')
      .or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
      .eq('activo', true)
      .order('nombre')
      .limit(20)
    clientesEncontrados = data ?? []
  }

  // 2) Cliente seleccionado
  let clienteSel: { id: string; nombre: string; cedula_rif: string; telefono: string | null; correo: string | null } | null = null
  let documentos: DocumentoTimeline[] = []

  if (clienteId) {
    const { data: cli } = await supabase
      .from('clientes')
      .select('id, nombre, cedula_rif, telefono, correo')
      .eq('id', clienteId)
      .single()

    if (cli) {
      clienteSel = cli

      // Cotizaciones (match por cedula_rif)
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select('id, numero, fecha, estado, marca, modelo, modalidad, plan, cliente_nombre, cliente_ci_rif, costo_total, total_inicial, resend_email_id, email_ultimo_estado, email_ultimo_evento_at')
        .eq('cliente_ci_rif', cli.cedula_rif)
        .order('fecha', { ascending: false })
        .limit(200)

      // Proformas (match por cliente_id)
      const { data: pros } = await supabase
        .from('proformas')
        .select('id, numero, fecha_emision, precio_vehiculo, monto_inicial, monto_financiado, num_cuotas, correo_enviado_at, vehiculo_snapshot, credito_snapshot, resend_email_id, email_ultimo_estado, email_ultimo_evento_at')
        .eq('cliente_id', cli.id)
        .order('fecha_emision', { ascending: false })
        .limit(200)

      const docsCot: DocumentoTimeline[] = (cots ?? []).map((c: any) => ({
        id: c.id,
        tipo: 'cotizacion',
        numero: c.numero,
        fecha: c.fecha,
        estado: c.estado,
        vehiculoLabel: `${c.marca} ${c.modelo}`,
        extraInfo: c.modalidad === 'contado'
          ? 'Contado'
          : c.plan === 'ac500' ? 'Asegúrate $500'
          : c.plan === 'banco_100' ? 'Crédito Banco 24m'
          : 'Crédito Vehimotors 24m',
        pdfUrl: `/api/cotizaciones/${c.id}/pdf`,
        detalleUrl: `/gestion-ventas?tab=cotizaciones`,
        clienteNombre: c.cliente_nombre,
        clienteCiRif: c.cliente_ci_rif,
        monto: c.costo_total ? Number(c.costo_total) : null,
        emailUltimoEstado: c.email_ultimo_estado ?? null,
        emailUltimoEventoAt: c.email_ultimo_evento_at ?? null,
        resendEmailId: c.resend_email_id ?? null,
      }))

      const docsPro: DocumentoTimeline[] = (pros ?? []).map((p: any) => {
        const veh = p.vehiculo_snapshot ?? {}
        const cred = p.credito_snapshot ?? {}
        return {
          id: p.id,
          tipo: 'proforma',
          numero: p.numero,
          fecha: p.fecha_emision,
          estado: p.correo_enviado_at ? 'enviada' : 'emitida',
          vehiculoLabel: veh.marca && veh.modelo ? `${veh.marca} ${veh.modelo}${veh.placa ? ` · ${veh.placa}` : ''}` : null,
          extraInfo: `${p.num_cuotas ?? cred.num_cuotas ?? 0} cuotas`,
          pdfUrl: `/api/proformas/${p.id}/pdf`,
          detalleUrl: cred.id ? `/creditos/${cred.id}` : null,
          clienteNombre: cli.nombre,
          clienteCiRif: cli.cedula_rif,
          monto: p.precio_vehiculo ? Number(p.precio_vehiculo) : null,
          emailUltimoEstado: p.email_ultimo_estado ?? null,
          emailUltimoEventoAt: p.email_ultimo_evento_at ?? null,
          resendEmailId: p.resend_email_id ?? null,
        }
      })

      documentos = [...docsCot, ...docsPro].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    }
  }

  const totalCot = documentos.filter(d => d.tipo === 'cotizacion').length
  const totalPro = documentos.filter(d => d.tipo === 'proforma').length

  return (
    <div className="p-4 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-full flex items-center justify-center">
            <ClipboardList size={20} className="text-oriental-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-oriental-black">Historial del cliente</h1>
            <p className="text-oriental-gray text-sm">Documentos emitidos: cotizaciones y proformas</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <form action="/historial" method="GET" className="mb-6">
        <div className="relative max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar cliente por nombre o cédula / RIF…"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-oriental-black placeholder-gray-400 focus:outline-none focus:border-oriental-red focus:ring-1 focus:ring-oriental-red/20 transition-colors"
          />
          {(q || clienteId) && (
            <Link
              href="/historial"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oriental-red transition-colors"
              title="Limpiar"
            >
              ✕
            </Link>
          )}
        </div>
      </form>

      {/* Resultados de búsqueda (si no hay cliente seleccionado) */}
      {q && !clienteId && (
        <div className="mb-6">
          <p className="text-xs text-oriental-gray mb-2">
            {clientesEncontrados.length} resultado{clientesEncontrados.length !== 1 ? 's' : ''}
          </p>
          {clientesEncontrados.length === 0 ? (
            <div className="card p-6 text-center">
              <Search size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-oriental-gray">Sin resultados para <span className="font-semibold text-oriental-black">"{q}"</span></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientesEncontrados.map(c => (
                <Link
                  key={c.id}
                  href={`/historial?cliente=${c.id}`}
                  className="card p-4 hover:shadow-md hover:border-oriental-red transition-all flex items-start gap-3"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-oriental-black truncate">{c.nombre}</p>
                    <p className="text-xs text-oriental-gray">{c.cedula_rif}</p>
                    {c.telefono && <p className="text-xs text-gray-400 mt-0.5">{c.telefono}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detalle del cliente seleccionado */}
      {clienteSel && (
        <>
          <div className="card p-5 mb-6">
            <div className="flex items-start gap-4">
              <Link
                href="/historial"
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Volver a búsqueda"
              >
                <ArrowLeft size={16} className="text-oriental-gray" />
              </Link>
              <div className="w-12 h-12 bg-oriental-red/10 rounded-full flex items-center justify-center">
                <User size={22} className="text-oriental-red" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-oriental-black">{clienteSel.nombre}</h2>
                <p className="text-sm text-oriental-gray">{clienteSel.cedula_rif}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {clienteSel.telefono && <span>{clienteSel.telefono}</span>}
                  {clienteSel.correo && <span>{clienteSel.correo}</span>}
                </div>
              </div>
              <Link
                href={`/clientes/${clienteSel.id}`}
                className="text-xs font-semibold text-oriental-red hover:underline"
              >
                Ver perfil →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-oriental-black">{documentos.length}</p>
                <p className="text-[11px] text-oriental-gray uppercase tracking-wide">Documentos</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalCot}</p>
                <p className="text-[11px] text-blue-600 uppercase tracking-wide">Cotizaciones</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{totalPro}</p>
                <p className="text-[11px] text-amber-600 uppercase tracking-wide">Proformas</p>
              </div>
            </div>
          </div>

          <HistorialTimeline
            documentos={documentos}
            estadoCotColors={estadoCotColors}
            estadoCotLabel={estadoCotLabel}
          />
        </>
      )}

      {/* Estado inicial (sin búsqueda) */}
      {!q && !clienteId && (
        <div className="card p-8 text-center">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-oriental-black font-semibold mb-1">Busca un cliente</p>
          <p className="text-sm text-oriental-gray">Escribe el nombre o la cédula/RIF para ver todos los documentos emitidos.</p>
        </div>
      )}
    </div>
  )
}
