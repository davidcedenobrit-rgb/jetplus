export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AcuerdoPagoPDF, AcuerdoPagoData } from '@/lib/acuerdo-pago-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const n = (x: unknown) => { const v = Number(x); return Number.isFinite(v) ? v : 0 }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = await createAdminClient()
  const { data: pro } = await admin.from('proformas').select('*').eq('id', id).maybeSingle()
  if (!pro) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

  // Identidad del concesionario (para el membrete) desde la cotización.
  let concId: string | null = null
  if (pro.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)

  const cli = (pro.cliente_snapshot ?? {}) as Record<string, any>
  const veh = (pro.vehiculo_snapshot ?? {}) as Record<string, any>
  const crono = (Array.isArray(pro.cronograma_snapshot) ? pro.cronograma_snapshot : []) as Record<string, any>[]

  const filas = crono.map((f, i) => ({
    numero: n(f.numero) || (i + 1),
    tipo: (f.tipo as string) || 'Vehimotor',
    etiqueta: (f.etiqueta as string) || `Cuota ${n(f.numero) || i + 1}`,
    monto: n(f.monto),
  }))

  // ¿El crédito Vehimotor corre en paralelo con el inicial? Se infiere del
  // cronograma: es simultáneo si la primera cuota Vehimotor cae dentro del
  // periodo del inicial (día ≤ último abono del inicial). Si arranca después
  // (último día del inicial + 30), no es simultáneo.
  const diasIni = crono.filter(f => ((f.tipo as string) || 'Vehimotor') === 'Inicial').map(f => n(f.dias))
  const diasVm = crono.filter(f => ((f.tipo as string) || 'Vehimotor') !== 'Inicial').map(f => n(f.dias))
  const ultimoDiaInicial = diasIni.length ? Math.max(...diasIni) : 0
  const primerDiaVm = diasVm.length ? Math.min(...diasVm) : null
  const creditoSimultaneo = primerDiaVm != null && ultimoDiaInicial > 0 && primerDiaVm <= ultimoDiaInicial

  const vehiculo = [veh.marca, veh.modelo, veh.placa ? `· ${veh.placa}` : '', veh.color ? `(${veh.color})` : '']
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  const data: AcuerdoPagoData = {
    fecha: (pro.fecha_emision ? String(pro.fecha_emision).slice(0, 10) : new Date().toISOString().slice(0, 10)),
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    selloSrc: c.selloSrc,
    numeroProforma: pro.numero ?? '',
    clienteNombre: cli.nombre ?? '',
    clienteCiRif: cli.cedula_rif ?? '',
    vehiculo: vehiculo || '—',
    precio: n(pro.precio_vehiculo),
    inicialTotal: n(pro.monto_inicial),
    financiado: n(pro.monto_financiado),
    condiciones: (pro.observaciones as string) || (pro.condiciones_personalizadas as string) || '',
    creditoSimultaneo,
    filas,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(AcuerdoPagoPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="acuerdo-pago-${pro.numero}.pdf"` },
  })
}
