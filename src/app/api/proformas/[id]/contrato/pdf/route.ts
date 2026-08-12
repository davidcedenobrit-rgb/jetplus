export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ContratoCreditoPDF, ContratoCreditoData, AmortRow } from '@/lib/contrato-credito-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { getVendedorLegal } from '@/lib/vendedor-legal'
import { montoBsEnLetras } from '@/lib/numero-a-letras'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']
const CIUDAD_CONCES: Record<string, string> = { 'jetplus': 'Porlamar', 'la-oriental': 'Maturín', 'kiauto': 'Puerto Ordaz', 'autosurca': 'El Tigre' }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaLarga(iso?: string | null): string {
  const d = String(iso ?? '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return ''
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`
}
const fmt2 = (n: number) => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  const financiamiento = Number(pro.monto_financiado) || 0
  if (financiamiento <= 0) return NextResponse.json({ error: 'La proforma no tiene financiamiento; el contrato de crédito no aplica.' }, { status: 400 })

  let concId: string | null = null
  if (pro.cotizacion_id) {
    const { data: cot } = await admin.from('cotizaciones').select('concesionario_id').eq('id', pro.cotizacion_id).maybeSingle()
    concId = cot?.concesionario_id ?? null
  }
  const c = await getConcesionarioIdentity(admin, concId)
  const vl = getVendedorLegal(concId)

  const cli = (pro.cliente_snapshot ?? {}) as Record<string, unknown>
  const veh = (pro.vehiculo_snapshot ?? {}) as Record<string, unknown>
  const est = (pro.estructura_costos ?? {}) as Record<string, unknown>
  const lineas = (est.lineas ?? {}) as Record<string, number>
  const cronograma = (pro.cronograma_snapshot ?? []) as { tipo?: string; monto?: number; fecha_vencimiento?: string }[]
  const cuotasCron = cronograma.filter(r => r.tipo === 'Vehimotor')

  const precioBase = Number(pro.precio_vehiculo) || Number(est.precioBase) || 0
  // Jetplus: exonerado de IVA (Puerto Libre de Margarita).
  const iva = 0
  const placaMonto = Number(lineas.placa) || 400
  const numCuotas = Number(pro.num_cuotas) || cuotasCron.length || 24
  const cuota = Number(cuotasCron[0]?.monto) || (numCuotas > 0 ? Math.round((financiamiento / numCuotas) * 100) / 100 : 0)
  // Precio total de la venta = total de la operación (inicial + financiado).
  const precioTotalVenta = (Number(pro.monto_inicial) || 0) + financiamiento

  // Cuadro de amortización (francés): interés sobre saldo a la tasa mensual.
  const tasaAnual = Number(est.tasaPct) || 0
  const rMensual = tasaAnual / 100 / 12
  const amortizacion: AmortRow[] = []
  let saldo = financiamiento
  for (let i = 1; i <= numCuotas; i++) {
    const interes = Math.round(saldo * rMensual * 100) / 100
    let amort = Math.round((cuota - interes) * 100) / 100
    let cuotaFila = cuota
    if (i === numCuotas) { amort = saldo; cuotaFila = Math.round((saldo + interes) * 100) / 100 } // ajuste final
    saldo = Math.round((saldo - amort) * 100) / 100
    if (saldo < 0) saldo = 0
    amortizacion.push({
      nro: i, cuota: cuotaFila, interes, cuotaEspecial: 0, amortizacion: amort, saldo,
      fecha: fechaLarga(cuotasCron[i - 1]?.fecha_vencimiento) || '',
    })
  }

  // Contravalor en Bs del monto financiado, a la tasa BCV del día.
  const { data: cfg } = await admin.from('config_cotizaciones').select('clave, valor').in('clave', ['tasa_bcv'])
  const tasaBcv = Number((cfg ?? []).find(x => x.clave === 'tasa_bcv')?.valor) || 0
  const contravalorNum = Math.round(financiamiento * tasaBcv * 100) / 100
  const contravalorBs = tasaBcv > 0
    ? `${montoBsEnLetras(contravalorNum)} (Bs. ${fmt2(contravalorNum)})`
    : '________________'

  const primeraCuota = fechaLarga(cuotasCron[0]?.fecha_vencimiento) || fechaLarga(pro.primera_cuota_fecha)
  const ciudad = CIUDAD_CONCES[concId ?? 'jetplus'] ?? 'Porlamar'
  const hoy = new Date()

  const data: ContratoCreditoData = {
    membrete: { nombre: c.nombre, rif: c.rif, direccion: c.direccion, telefono: c.telefono, correo: c.correo, logoSrc: c.logoSrc, colorPrimario: c.colorPrimario, colorSecundario: c.colorSecundario },
    ciudad,
    vendedorNombre: vl.nombre || c.nombre,
    vendedorRif: vl.rif || c.rif || '',
    vendedorRegistro: vl.registro || '',
    vendedorRegistroFecha: vl.registroFecha || '',
    vendedorRegistroNro: vl.registroNro || '',
    vendedorRegistroTomo: vl.registroTomo || '',
    vendedorRepresentante: vl.representante || '',
    vendedorRepresentanteCedula: vl.representanteCedula || '',
    vendedorRepresentanteCargo: vl.representanteCargo || 'Director',
    vendedorDireccion: (c.direccion || '').replace(/\n/g, ' '),
    vendedorTelefono: c.telefono || '',
    vendedorCorreo: c.correo || '',
    domicilioEspecial: vl.domicilioEspecial || ciudad,
    compradorNombre: (cli.nombre as string) ?? '',
    compradorCedula: (cli.cedula_rif as string) ?? '',
    compradorDireccion: (cli.direccion as string) ?? '',
    compradorTelefono: (cli.telefono as string) ?? '',
    compradorCorreo: (cli.correo as string) ?? '',
    vehMarca: (veh.marca as string) ?? '',
    vehModelo: (veh.modelo as string) ?? '',
    vehVersion: (veh.version as string) ?? '',
    vehAnio: String(veh.anio ?? ''),
    vehColor: (veh.color as string) ?? '',
    vehVin: (veh.vin as string) ?? '',
    vehSerialMotor: (veh.serial_motor as string) ?? '',
    vehPlaca: (veh.placa as string) ?? '',
    certificadoOrigenNro: (veh.certificado_origen as string) ?? '',
    certificadoOrigenFecha: fechaLarga(veh.certificado_origen_fecha as string) || '',
    precioTotalVenta,
    placaMonto,
    iva,
    financiamiento,
    plazoMeses: numCuotas,
    cuota,
    cuotasEspeciales: 0,
    primeraCuotaFecha: primeraCuota,
    saldoInicial: financiamiento,
    contravalorBs,
    tasaBcv: tasaBcv > 0 ? fmt2(tasaBcv) : '',
    tasaBcvFecha: fechaLarga(hoy.toISOString()),
    amortizacion,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ContratoCreditoPDF, { data }) as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(buffer as any, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="contrato-credito-${pro.numero}.pdf"` },
  })
}
