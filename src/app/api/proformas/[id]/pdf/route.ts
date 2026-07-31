export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase/server'
import { ProformaPDF } from '@/lib/proforma-pdf'
import type { ProformaPDFData, CuotaCronogramaItem } from '@/lib/proforma-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'

function getLogoBase64(): string {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo-la-oriental.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return 'https://assets.cdn.filesafe.space/XZDJ4aSOAL1crWRCXyY6/media/698367bc1dfc0253b24abd7a.png'
  }
}

function getSelloBase64(): string | undefined {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'sello-la-oriental.jpeg'))
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

const planLabel: Record<string, string> = {
  inicial_la_oriental: 'La Oriental',
  financiamiento_vehimotors: 'Financiamiento Vehimotors',
  cuota_especial: 'Cuota Especial Vehimotors',
  asegurate_500: 'Asegúrate $500',
  credito_40_60: '40/60 Vehimotors',
  contado: 'Contado',
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createAdminClient()
  const { data: pro, error } = await supabase
    .from('proformas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !pro) return NextResponse.json({ error: 'Proforma no encontrada' }, { status: 404 })

  const cliente: any = pro.cliente_snapshot ?? {}
  const vehiculo: any = pro.vehiculo_snapshot ?? {}
  const credito: any = pro.credito_snapshot ?? {}
  const cronograma: CuotaCronogramaItem[] = (pro.cronograma_snapshot ?? []) as CuotaCronogramaItem[]

  // Crédito de la INICIAL otorgado por La Oriental (acuerdo de gestión de cobro).
  // Es un compromiso aparte del crédito Vehimotor. Solo aplica cuando existe un
  // acuerdo aceptado ligado a la cotización de esta proforma.
  let acuerdoLaOriental: ProformaPDFData['acuerdoLaOriental'] = null
  if (pro.cotizacion_id) {
    const { data: ac } = await supabase
      .from('acuerdos_cobro')
      .select('monto_financiado, num_cuotas, cuota_monto, tasa_interes, plan_cuotas, estado')
      .eq('cotizacion_id', pro.cotizacion_id)
      .maybeSingle()
    if (ac && Number(ac.monto_financiado) > 0) {
      const nc = ac.num_cuotas != null ? Math.round(Number(ac.num_cuotas)) : 0
      const cuota = ac.cuota_monto != null ? Number(ac.cuota_monto) : (nc > 0 ? Number(ac.monto_financiado) / nc : 0)
      acuerdoLaOriental = {
        montoFinanciado: Number(ac.monto_financiado),
        numCuotas: nc,
        cuotaMonto: cuota,
        tasaInteres: ac.tasa_interes != null ? Number(ac.tasa_interes) : null,
        planCuotas: ac.plan_cuotas ?? null,
        totalAPagar: nc > 0 && cuota > 0 ? Math.round(cuota * nc * 100) / 100 : Number(ac.monto_financiado),
      }
    }
  }

  // Logo y sello: La Oriental usa los archivos locales; si la proforma nace de
  // una cotización de otra sede, se usa el logo/sello de esa sede.
  let logoSrc: string = getLogoBase64()
  let selloSrc: string | undefined = getSelloBase64()
  if (pro.cotizacion_id) {
    const { data: cot } = await supabase.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    if (cot?.concesionario_id && cot.concesionario_id !== 'la-oriental') {
      const ident = await getConcesionarioIdentity(supabase, cot.concesionario_id)
      if (ident.logoSrc) logoSrc = ident.logoSrc
      if (ident.selloSrc) selloSrc = ident.selloSrc
    }
  }

  const pdfData: ProformaPDFData = {
    logoSrc,
    selloSrc,
    numero: pro.numero,
    fecha: fmtDate(pro.fecha_emision),
    clienteNombre: cliente.nombre ?? '',
    clienteCiRif: cliente.cedula_rif ?? '',
    clienteDireccion: cliente.direccion ?? null,
    clienteCorreo: cliente.correo ?? null,
    clienteTelefono: cliente.telefono ?? null,
    marca: vehiculo.marca ?? '',
    modelo: vehiculo.modelo ?? '',
    placa: vehiculo.placa ?? null,
    anio: vehiculo.anio ?? null,
    color: vehiculo.color ?? null,
    precioBase: Number(vehiculo.precio_base ?? 0),
    totalVehiculo: Number(pro.precio_vehiculo ?? 0),
    inicialPagada: Number(pro.monto_inicial ?? 0),
    saldoFinanciado: Number(pro.monto_financiado ?? 0),
    // La "cuota mensual" de referencia es una cuota Vehimotor (si el cronograma
    // trae abonos del inicial mezclados, no tomar el primero).
    cuotaMensual: (() => {
      const vm = cronograma.find((c: any) => c.tipo === 'Vehimotor')
      return vm ? Number(vm.monto) : (cronograma.length > 0 ? Number(cronograma[0].monto) : 0)
    })(),
    numeroCuotas: Number(pro.num_cuotas ?? cronograma.filter((c: any) => !c.tipo || c.tipo === 'Vehimotor').length),
    planTipo: credito.plan_tipo ?? '',
    planLabel: planLabel[credito.plan_tipo] ?? 'Crédito',
    condicionesPersonalizadas: pro.condiciones_personalizadas ?? null,
    bnVehimotors: pro.bn_vehimotors ?? null,
    // Proforma previa a la venta: nació de una cotización y aún no hay crédito.
    preVenta: !pro.credito_id && !!pro.cotizacion_id,
    cronograma,
    acuerdoLaOriental,
    acuerdoInicial: credito.acuerdo_inicial ? {
      monto_acordado: Number(credito.acuerdo_inicial.monto_acordado ?? 0),
      monto_pagado: Number(credito.acuerdo_inicial.monto_pagado ?? 0),
      saldo_por_pagar: Number(credito.acuerdo_inicial.saldo_por_pagar ?? 0),
      fecha_limite: credito.acuerdo_inicial.fecha_limite ?? null,
      observaciones: credito.acuerdo_inicial.observaciones ?? null,
    } : null,
  }

  const buffer = await renderToBuffer(
    React.createElement(ProformaPDF, { data: pdfData }) as React.ReactElement<any>
  )

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pro.numero}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
