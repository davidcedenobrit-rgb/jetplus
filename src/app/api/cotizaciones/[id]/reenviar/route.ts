export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'

function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return s }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('id', id)
      .single()

    if (!cot) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    let ac500Schedule: AC500ScheduleData | undefined
    if (cot.plan === 'ac500' && cot.ac500_meses && cot.ac500_cuotas) {
      const meses = Number(cot.ac500_meses)
      const montos = cot.ac500_cuotas as number[]
      const cuotas: AC500CuotaItem[] = montos.map((monto: number, i: number) => ({
        label: i + 1 === meses ? `Cuota ${i + 1} (Entrega)` : `Cuota ${i + 1}`,
        monto,
      }))
      ac500Schedule = {
        reserva: Number(cot.total_inicial),
        meses,
        modelo: cot.modelo,
        cuotas,
        total: Number(cot.costo_total),
      }
    }

    const pdfData: CotizacionPDFData = {
      numero: cot.numero,
      fecha: fmtDate(cot.fecha),
      vencimiento: fmtDate(cot.vencimiento),
      clienteNombre: cot.cliente_nombre,
      clienteCiRif: cot.cliente_ci_rif,
      clienteDireccion: cot.cliente_direccion,
      clienteCorreo: cot.cliente_correo,
      clienteTelefono: cot.cliente_telefono,
      clienteCiudadEstado: cot.cliente_ciudad_estado,
      clienteCodigoPostal: cot.cliente_codigo_postal,
      agenteRetencion: !!cot.agente_retencion,
      marca: cot.marca,
      modelo: cot.modelo,
      precioBase: Number(cot.precio_base),
      modalidad: cot.modalidad,
      plan: cot.plan,
      ivaMonto: Number(cot.iva_monto),
      gastosMonto: Number(cot.gastos_monto),
      totalVehiculo: cot.plan === 'banco_100' && cot.financiamiento_monto
        ? Number(cot.financiamiento_monto) / 0.70
        : undefined,
      totalInicial: Number(cot.total_inicial),
      financiamientoMonto: cot.financiamiento_monto ? Number(cot.financiamiento_monto) : null,
      cuotaMensual: cot.cuota_mensual ? Number(cot.cuota_mensual) : null,
      costoTotal: Number(cot.costo_total),
      ac500Schedule,
    }

    await enviarCotizacionCliente(pdfData, cot.token_respuesta, id)

    await supabase
      .from('cotizaciones')
      .update({ descuento_solicitado: false })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[reenviar] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
