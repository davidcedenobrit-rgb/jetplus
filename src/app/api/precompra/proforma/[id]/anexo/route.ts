export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AnexoADocument, buildAnexoMontos, type AnexoAData } from '@/lib/anexo-a-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }

function fmtDate(s: string | null) {
  if (!s) return ''
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const url = new URL(req.url)
  const variante: 'oriental' | 'vehimotors' = url.searchParams.get('variante') === 'vehimotors' ? 'vehimotors' : 'oriental'
  const descargar = url.searchParams.get('download') === '1'

  const supabase = await createAdminClient()
  const { data: pf } = await supabase.from('precompra_proformas').select('*').eq('id', id).maybeSingle()
  if (!pf) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

  const conces = await getConcesionarioIdentity(supabase, pf.concesionario_id ?? 'la-oriental')

  const cuotasBase: number[] = Array.isArray(pf.cuotas) ? pf.cuotas.map(num) : []
  const montos = buildAnexoMontos({ variante, reserva: num(pf.reserva) || 500, cuotasBase, cuotaFinal: num(pf.cuota_final) })

  const data: AnexoAData = {
    logoSrc: conces.logoSrc,
    empresaNombre: conces.nombre,
    empresaRif: conces.rif,
    empresaDireccion: conces.direccion,
    empresaTelefono: conces.telefono,
    empresaCorreo: conces.correo,
    variante,
    ciclo: pf.ciclo ?? null,
    fecha: fmtDate(pf.fecha_plan) || fmtDate(new Date().toISOString().slice(0, 10)),
    clienteNombre: pf.cliente_nombre,
    estadoCivil: pf.estado_civil,
    conyuge: pf.conyuge ?? null,
    clienteCedula: pf.cliente_cedula,
    clienteRif: pf.cliente_rif,
    clienteDireccion: pf.cliente_direccion,
    clienteTelefono: pf.cliente_telefono,
    clienteCorreo: pf.cliente_correo,
    unidad: pf.unidad || pf.modelo || '',
    colores: pf.colores,
    gastosAsociados: montos.gastosAsociados,
    valorVentaUnidad: montos.valorVentaUnidad,
    reserva: montos.reserva,
    cuotas: montos.cuotas,
    totalPagar: montos.totalPagar,
    serieCobertura: pf.serie_cobertura,
  }

  const buffer = await renderToBuffer(
    React.createElement(AnexoADocument, { data }) as React.ReactElement<Record<string, unknown>>
  )
  const nombreArch = `Anexo-A-${variante === 'vehimotors' ? 'Vehimotors' : 'Oriental'}-${(pf.cliente_nombre || '').split(' ')[0] || 'cliente'}.pdf`
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombreArch}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
