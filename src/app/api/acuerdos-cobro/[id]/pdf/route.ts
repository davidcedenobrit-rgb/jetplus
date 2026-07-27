export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AcuerdoCobroPDF, AcuerdoCobroData } from '@/lib/acuerdo-cobro-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const admin = await createAdminClient()

  const { data: ac } = await admin.from('acuerdos_cobro').select('*').eq('id', id).maybeSingle()
  if (!ac) return NextResponse.json({ error: 'Acuerdo no encontrado' }, { status: 404 })

  const { data: cot } = await admin
    .from('cotizaciones')
    .select('cliente_nombre, cliente_ci_rif, marca, modelo, concesionario_id, vendedora_nombre, vendedoras, fecha')
    .eq('id', ac.cotizacion_id)
    .maybeSingle()

  const vendedoras = Array.isArray(ac.vendedoras) && ac.vendedoras.length
    ? ac.vendedoras.map((v: { nombre?: string }) => v?.nombre).filter(Boolean).join(', ')
    : (cot?.vendedora_nombre ?? '')

  // Membrete dinámico: usa la identidad (nombre, RIF, logo, sello) de la agencia
  // de donde proviene la cotización. Si no hay, cae en La Oriental.
  const conces = await getConcesionarioIdentity(admin, cot?.concesionario_id ?? null)

  const data: AcuerdoCobroData = {
    fecha: (ac.created_at ? String(ac.created_at).slice(0, 10) : (cot?.fecha ?? new Date().toISOString().slice(0, 10))),
    concesionario: conces.nombre,
    empresaNombre: conces.nombre,
    empresaRif: conces.rif,
    empresaDireccion: conces.direccion,
    empresaTelefono: conces.telefono,
    empresaCorreo: conces.correo,
    logoSrc: conces.logoSrc,
    selloSrc: conces.selloSrc,
    vendedoras,
    clienteNombre: cot?.cliente_nombre ?? '—',
    clienteCiRif: cot?.cliente_ci_rif ?? '—',
    marca: cot?.marca ?? '',
    modelo: cot?.modelo ?? '',
    vin: null,
    inicialTotal: ac.inicial_total != null ? Number(ac.inicial_total) : null,
    montoContado: ac.monto_contado != null ? Number(ac.monto_contado) : null,
    montoFinanciado: Number(ac.monto_financiado ?? 0),
    numCuotas: ac.num_cuotas != null ? Number(ac.num_cuotas) : null,
    cuotaMonto: ac.cuota_monto != null ? Number(ac.cuota_monto) : null,
    planCuotas: ac.plan_cuotas ?? null,
    observaciones: ac.observaciones ?? null,
  }

  const pdfBuffer = await renderToBuffer(React.createElement(AcuerdoCobroPDF, { data }) as any)
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acuerdo-gestion-cobro-${id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
