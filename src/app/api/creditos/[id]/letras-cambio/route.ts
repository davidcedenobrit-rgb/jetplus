export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LetraCambioPDF, LetraCambioData } from '@/lib/letra-cambio-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { getVendedorLegal } from '@/lib/vendedor-legal'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!usuario?.rol || !ROLES.includes(usuario.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id: creditoId } = await params
  const url = new URL(req.url)
  const fiadorNombre = url.searchParams.get('fiadorNombre')?.trim() || null
  const fiadorCedula = url.searchParams.get('fiadorCedula')?.trim() || null

  const admin = await createAdminClient()
  const { data: credito, error: credErr } = await admin
    .from('creditos')
    .select(`
      id, plan_tipo, fecha_inicio, num_cuotas, cliente_id,
      clientes ( nombre, cedula_rif, direccion, ciudad, telefono, correo, tipo, identificacion_juridica )
    `)
    .eq('id', creditoId)
    .single()

  if (credErr || !credito) {
    return NextResponse.json({ error: 'Crédito no encontrado' }, { status: 404 })
  }

  if (credito.plan_tipo !== 'inicial_la_oriental') {
    return NextResponse.json(
      { error: 'Las letras de cambio solo aplican al crédito de Inicial Jetplus' },
      { status: 400 }
    )
  }

  const { data: cuotas } = await admin
    .from('cuotas')
    .select('numero_cuota, monto, fecha_vencimiento')
    .eq('credito_id', creditoId)
    .order('numero_cuota', { ascending: true })

  if (!cuotas || cuotas.length === 0) {
    return NextResponse.json({ error: 'El crédito no tiene cuotas registradas' }, { status: 400 })
  }

  const cliente: any = (credito as any).clientes
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 })
  }

  const data: LetraCambioData = {
    ciudad: cliente.ciudad || 'Porlamar',
    estado: 'Nueva Esparta',
    fechaEmision: credito.fecha_inicio,
    fechaCreditoInicio: credito.fecha_inicio,
    deudorNombre: cliente.nombre,
    deudorCedula: cliente.cedula_rif ?? '',
    deudorDireccion: cliente.direccion ?? '',
    deudorTelefono: cliente.telefono ?? '',
    deudorCorreo: cliente.correo ?? '',
    deudorEsJuridica: cliente.tipo === 'juridico',
    deudorIdentJuridica: cliente.identificacion_juridica ?? null,
    fiadorNombre,
    fiadorCedula,
    letras: cuotas.map(c => ({
      monto: Number(c.monto),
      fechaVencimiento: c.fecha_vencimiento,
    })),
  }

  // Membrete del concesionario de turno (Jetplus por defecto).
  const concId = (credito as any).concesionario_id ?? 'jetplus'
  const ident = await getConcesionarioIdentity(admin, concId)
  data.membrete = {
    nombre: ident.nombre, rif: ident.rif, direccion: ident.direccion,
    telefono: ident.telefono, correo: ident.correo, logoSrc: ident.logoSrc,
    colorPrimario: ident.colorPrimario, colorSecundario: ident.colorSecundario,
  }
  const vl = getVendedorLegal(concId)
  data.acreedorNombre = vl.nombre ?? ident.nombre
  data.acreedorRif = vl.rif ?? ident.rif ?? undefined
  data.acreedorIdent = (vl.registro && vl.registroFecha && vl.registroNro && vl.registroTomo)
    ? `inscrita por ante el ${vl.registro}, en fecha ${vl.registroFecha}, bajo el Nº ${vl.registroNro}, Tomo ${vl.registroTomo}`
    : null

  const pdfBuffer = await renderToBuffer(
    React.createElement(LetraCambioPDF, { data }) as any
  )

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="letras-cambio-${creditoId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
