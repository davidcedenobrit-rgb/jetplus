export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { LetraCambioPDF, LetraCambioData } from '@/lib/letra-cambio-pdf'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem', 'carla']

// Divide monto en N partes con centavos, ajustando la ultima para que la suma sea exacta.
function dividirMonto(monto: number, n: number): number[] {
  if (n <= 1) return [Number(monto.toFixed(2))]
  const base = Math.floor((monto / n) * 100) / 100
  const parts = new Array(n - 1).fill(base)
  const suma = base * (n - 1)
  const ultima = Number((monto - suma).toFixed(2))
  parts.push(ultima)
  return parts
}

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

  const { id: acuerdoId } = await params
  const url = new URL(req.url)
  const numLetrasParam = parseInt(url.searchParams.get('numLetras') ?? '1', 10)
  const numLetras = Math.max(1, Math.min(60, isNaN(numLetrasParam) ? 1 : numLetrasParam))
  const diaVencParam = parseInt(url.searchParams.get('diaVencimiento') ?? '', 10)
  const fiadorNombre = url.searchParams.get('fiadorNombre')?.trim() || null
  const fiadorCedula = url.searchParams.get('fiadorCedula')?.trim() || null

  const admin = await createAdminClient()
  const { data: acuerdo, error: acErr } = await admin
    .from('acuerdos_inicial')
    .select(`
      id, monto_acordado, fecha_limite, created_at, cliente_id,
      clientes ( nombre, cedula_rif, direccion, ciudad, telefono, correo )
    `)
    .eq('id', acuerdoId)
    .single()

  if (acErr || !acuerdo) {
    return NextResponse.json({ error: 'Acuerdo no encontrado' }, { status: 404 })
  }

  const cliente: any = (acuerdo as any).clientes
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 })
  }

  const montoTotal = Number(acuerdo.monto_acordado)
  const montosPorLetra = dividirMonto(montoTotal, numLetras)

  // Fechas de vencimiento
  // Si numLetras === 1: usar fecha_limite (o si no hay, hoy+30 dias)
  // Si numLetras > 1: mensual, dia = diaVenc (o dia de fecha_limite si existe, o dia actual)
  const hoy = new Date()
  const fechaEmision = (acuerdo.created_at ?? hoy.toISOString()).slice(0, 10)

  let letras: { monto: number; fechaVencimiento: string }[]

  if (numLetras === 1) {
    const fv = acuerdo.fecha_limite ?? new Date(hoy.getTime() + 30 * 86400000).toISOString().slice(0, 10)
    letras = [{ monto: montosPorLetra[0], fechaVencimiento: fv }]
  } else {
    const fechaLimite = acuerdo.fecha_limite ? new Date(acuerdo.fecha_limite + 'T12:00:00') : null
    const dia = !isNaN(diaVencParam) && diaVencParam >= 1 && diaVencParam <= 31
      ? diaVencParam
      : (fechaLimite ? fechaLimite.getDate() : new Date(fechaEmision + 'T12:00:00').getDate())

    // Primer vencimiento: mes siguiente al de emision (si el dia ya paso este mes) o este mes
    const emision = new Date(fechaEmision + 'T12:00:00')
    const primerMes = new Date(emision.getFullYear(), emision.getMonth() + 1, 1)
    letras = montosPorLetra.map((m, i) => {
      const anio = primerMes.getFullYear()
      const mesIdx = primerMes.getMonth() + i
      const fv = new Date(anio, mesIdx, dia)
      // Ajustar si el dia excede el mes (ej: 31 en febrero) -> ultimo dia del mes
      if (fv.getMonth() !== ((mesIdx % 12) + 12) % 12) {
        fv.setDate(0)
      }
      const iso = `${fv.getFullYear()}-${String(fv.getMonth() + 1).padStart(2, '0')}-${String(fv.getDate()).padStart(2, '0')}`
      return { monto: m, fechaVencimiento: iso }
    })
  }

  const data: LetraCambioData = {
    ciudad: cliente.ciudad || 'Maturín',
    fechaEmision,
    fechaCreditoInicio: undefined,
    deudorNombre: cliente.nombre,
    deudorCedula: cliente.cedula_rif ?? '',
    deudorDireccion: cliente.direccion ?? '',
    deudorTelefono: cliente.telefono ?? '',
    deudorCorreo: cliente.correo ?? '',
    fiadorNombre,
    fiadorCedula,
    letras,
  }

  const pdfBuffer = await renderToBuffer(
    React.createElement(LetraCambioPDF, { data }) as any
  )

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="letras-cambio-${acuerdoId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
