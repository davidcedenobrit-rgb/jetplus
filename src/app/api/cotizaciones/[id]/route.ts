export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData } from '@/lib/cotizacion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { calcularTotalesCotizacion } from '@/lib/cotizacion-calc'

// Editar/negociar montos de una cotización es potestad del director (Rojas).
const ROLES_EDITAR = ['jose', 'admin', 'director']

/* eslint-disable @typescript-eslint/no-explicit-any */
// Acepta el rol de app_metadata (lo que usa el gating de las pantallas) o el de
// la tabla usuarios, para que la UI y la API nunca se contradigan.
async function puedeEditarCotizaciones(supabase: any, authUser: any): Promise<boolean> {
  const rolMeta = (authUser?.app_metadata?.rol as string) ?? ''
  if (ROLES_EDITAR.includes(rolMeta)) return true
  const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', authUser.id).single()
  return ROLES_EDITAR.includes(usuario?.rol ?? '')
}

function fmtDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')) : d
  return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const supabase = await createAdminClient()

    // Editar cotización completa (todos los campos + reenvío opcional + auditoría)
    if (body.accion === 'editar_completa') {
      // Solo el director (Rojas) puede editar/negociar montos.
      if (!(await puedeEditarCotizaciones(supabase, authUser))) {
        return NextResponse.json({ error: 'Solo el director puede editar cotizaciones' }, { status: 403 })
      }

      const { data: cotActual } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('id', id)
        .single()

      if (!cotActual) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

      const {
        precio_base, gastos_monto, cuota_mensual, modalidad, plan,
        cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono,
        cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal,
        agente_retencion, marca, modelo,
        motivo, reenviar_correo,
      } = body

      // Validaciones
      if (typeof precio_base !== 'number' || precio_base <= 0)
        return NextResponse.json({ error: 'Precio base inválido' }, { status: 400 })
      if (typeof gastos_monto !== 'number' || gastos_monto < 0)
        return NextResponse.json({ error: 'Gastos inválidos' }, { status: 400 })
      if (!['contado', 'credito_24'].includes(modalidad))
        return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
      if (!['vehimotors', 'banco_100', 'ac500', 'personalizado', 'banca_nacional'].includes(plan))
        return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
      if (!cliente_nombre?.trim() || !cliente_ci_rif?.trim())
        return NextResponse.json({ error: 'Nombre y C.I./RIF son obligatorios' }, { status: 400 })
      if (cliente_correo?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente_correo.trim()))
        return NextResponse.json({ error: 'Correo del cliente inválido' }, { status: 400 })

      // Recalcular con el motor único. Para banco, la placa y la tasa del banco
      // salen del catálogo (no se guardan en la fila); los meses del banco sí.
      let placaMonto = 400
      let tasaBancoPct = Number(cotActual.tasa_banco_pct) || 16
      if (plan === 'banco_100' && cotActual.vehiculo_id) {
        const { data: veh } = await supabase
          .from('catalogo_ventas')
          .select('placa_monto, tasa_banco_pct')
          .eq('id', cotActual.vehiculo_id)
          .maybeSingle()
        if (veh) {
          placaMonto = Number(veh.placa_monto) || 400
          tasaBancoPct = Number(veh.tasa_banco_pct) || 16
        }
      }

      let iva_monto: number
      let total_inicial: number
      let financiamiento_monto: number | null = null
      let cuota_mensual_final: number | null = null
      let costo_total: number

      if (plan === 'ac500') {
        // El esquema AC500 no depende de precio/gastos; se conservan los montos.
        iva_monto = Number(cotActual.iva_monto) || 0
        total_inicial = Number(cotActual.total_inicial) || 0
        financiamiento_monto = cotActual.financiamiento_monto != null ? Number(cotActual.financiamiento_monto) : null
        cuota_mensual_final = cotActual.cuota_mensual != null ? Number(cotActual.cuota_mensual) : null
        costo_total = Number(cotActual.costo_total) || 0
      } else if (plan === 'personalizado') {
        // Recalcula con los parámetros guardados del plan personalizado.
        const t = calcularTotalesCotizacion({
          precioBase: precio_base,
          modalidad: 'credito_24',
          plan: 'personalizado',
          gastos: gastos_monto,
          personalizadoInicialPct: (Number(cotActual.personalizado_inicial_pct) || 40) / 100,
          personalizadoMeses: Number(cotActual.personalizado_meses) || 24,
          personalizadoTasaPct: Number(cotActual.personalizado_tasa_pct) || 0,
        })
        iva_monto = t.iva
        total_inicial = t.totalInicial
        financiamiento_monto = t.financiamientoMonto
        cuota_mensual_final = t.cuotaMensual
        costo_total = t.costoTotal
      } else {
        const mesesBanco = Math.max(1, Math.round(Number(cotActual.cuotas_banco) || 24))
        // Cuota mensual del crédito Vehimotors: la fija Rojas o, si no la escribe,
        // se hereda la ya guardada. Si sigue en 0 (p. ej. la cotización nació como
        // Contado y ahora se pasa a crédito), se toma la del catálogo (tasa_credito)
        // para que un crédito Vehimotors nunca quede con cuota $0.
        let cuotaVhm = typeof cuota_mensual === 'number' ? cuota_mensual : (Number(cotActual.cuota_mensual) || 0)
        if (plan === 'vehimotors' && modalidad === 'credito_24' && cuotaVhm <= 0 && cotActual.vehiculo_id) {
          const { data: vehCat } = await supabase
            .from('catalogo_ventas')
            .select('tasa_credito')
            .eq('id', cotActual.vehiculo_id)
            .maybeSingle()
          cuotaVhm = Number(vehCat?.tasa_credito) || 0
        }
        const t = calcularTotalesCotizacion({
          precioBase: precio_base,
          modalidad,
          plan,
          gastos: gastos_monto,
          placaMonto,
          tasaBancoPct,
          mesesBanco,
          cuotaVehimotors: cuotaVhm,
        })
        iva_monto = t.iva
        total_inicial = t.totalInicial
        financiamiento_monto = t.financiamientoMonto
        cuota_mensual_final = t.cuotaMensual
        costo_total = t.costoTotal
        // Banco: Rojas puede fijar manualmente la cuota negociada (recalcula el costo con sus meses).
        if (plan === 'banco_100' && typeof cuota_mensual === 'number') {
          cuota_mensual_final = cuota_mensual
          costo_total = total_inicial + cuota_mensual * (t.mesesBanco ?? mesesBanco)
        }
      }

      // Re-vincular cliente_id si el CI/RIF ahora coincide con un cliente existente
      const ciNorm = cliente_ci_rif.trim().toUpperCase()
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .ilike('cedula_rif', ciNorm)
        .limit(1)
        .maybeSingle()
      const clienteIdVinculado = clienteExistente?.id ?? null

      const nuevos = {
        precio_base, iva_monto, gastos_monto, modalidad, plan,
        total_inicial, financiamiento_monto,
        cuota_mensual: cuota_mensual_final, costo_total,
        cliente_id: clienteIdVinculado,
        cliente_nombre: cliente_nombre.trim(),
        cliente_ci_rif: cliente_ci_rif.trim(),
        cliente_correo: (cliente_correo ?? '').trim().toLowerCase(),
        cliente_telefono: cliente_telefono?.trim() || null,
        cliente_direccion: cliente_direccion?.trim() || null,
        cliente_ciudad_estado: cliente_ciudad_estado?.trim() || null,
        cliente_codigo_postal: cliente_codigo_postal?.trim() || null,
        agente_retencion: !!agente_retencion,
        marca: marca?.trim() || cotActual.marca,
        modelo: modelo?.trim() || cotActual.modelo,
      }

      // Calcular diff para auditoría
      const cambios: Record<string, { antes: unknown; despues: unknown }> = {}
      for (const [k, v] of Object.entries(nuevos)) {
        const anterior = (cotActual as Record<string, unknown>)[k]
        const antes = typeof anterior === 'number' ? Number(anterior) : anterior
        const despues = typeof v === 'number' ? Number(v) : v
        if (antes !== despues) cambios[k] = { antes, despues }
      }

      const { error: updErr } = await supabase
        .from('cotizaciones')
        .update(nuevos)
        .eq('id', id)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      // Registrar auditoría (no bloqueante)
      if (Object.keys(cambios).length > 0 || motivo) {
        await supabase.from('cotizacion_ediciones').insert([{
          cotizacion_id: id,
          editado_por: authUser.id,
          editado_por_email: authUser.email ?? null,
          cambios,
          motivo: motivo?.trim() || null,
          reenvio_correo: !!reenviar_correo,
        }])
      }

      // Reenvío opcional
      let correoReenviado = false
      let correoError: string | null = null
      if (reenviar_correo) {
        try {
          const conces = await getConcesionarioIdentity(supabase, cotActual.concesionario_id ?? null)
          const pdfData: CotizacionPDFData = {
            logoSrc: conces.logoSrc,
            empresaNombre: conces.nombre,
            empresaRif: conces.rif,
            empresaDireccion: conces.direccion,
            empresaTelefono: conces.telefono,
            empresaCorreo: conces.correo,
            numero: cotActual.numero,
            fecha: fmtDate(cotActual.fecha),
            vencimiento: fmtDate(cotActual.vencimiento),
            clienteNombre: nuevos.cliente_nombre,
            clienteCiRif: nuevos.cliente_ci_rif,
            clienteDireccion: nuevos.cliente_direccion,
            clienteCorreo: nuevos.cliente_correo,
            clienteTelefono: nuevos.cliente_telefono,
            clienteCiudadEstado: nuevos.cliente_ciudad_estado,
            clienteCodigoPostal: nuevos.cliente_codigo_postal,
            agenteRetencion: nuevos.agente_retencion,
            marca: nuevos.marca,
            modelo: nuevos.modelo,
            cantidad: Number(cotActual.cantidad) || 1,
            precioBase: precio_base,
            modalidad,
            plan,
            ivaMonto: iva_monto,
            gastosMonto: gastos_monto,
            totalVehiculo: plan === 'banco_100' ? precio_base + iva_monto + placaMonto : undefined,
            totalInicial: total_inicial,
            financiamientoMonto: financiamiento_monto,
            cuotaMensual: cuota_mensual_final,
            mesesBanco: plan === 'banco_100' ? (Number(cotActual.cuotas_banco) || 24) : undefined,
            costoTotal: costo_total,
            inicialPct: plan === 'personalizado' ? (Number(cotActual.personalizado_inicial_pct) || 40) / 100 : undefined,
            mesesCredito: plan === 'personalizado' ? (Number(cotActual.personalizado_meses) || 24) : undefined,
            condicionesPersonalizadas: cotActual.condiciones_personalizadas ?? null,
          }
          await enviarCotizacionCliente(pdfData, cotActual.token_respuesta, id)
          correoReenviado = true
        } catch (emailErr: any) {
          console.error('[cotizaciones/patch] email reenvio error:', emailErr)
          correoError = emailErr?.message ?? 'Error al reenviar el correo'
        }
      }

      return NextResponse.json({
        ok: true,
        cambios_count: Object.keys(cambios).length,
        correoReenviado,
        correoError,
      })
    }

    // Propuesta de condiciones de pago personalizada: Rojas escribe una condición
    // de venta libre. Si el cliente acepta la cotización, ese texto pasa a ser la
    // modalidad/observación de la proforma.
    if (body.accion === 'guardar_condiciones') {
      if (!(await puedeEditarCotizaciones(supabase, authUser))) {
        return NextResponse.json({ error: 'Solo el director puede definir condiciones de pago' }, { status: 403 })
      }
      const texto = String(body.condiciones ?? '').trim()
      const { error: updErr } = await supabase
        .from('cotizaciones')
        .update({ condiciones_personalizadas: texto || null })
        .eq('id', id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      await supabase.from('cotizacion_ediciones').insert([{
        cotizacion_id: id,
        editado_por: authUser.id,
        editado_por_email: authUser.email ?? null,
        cambios: { condiciones_personalizadas: { antes: null, despues: texto || null } },
        motivo: 'Propuesta de condiciones de pago personalizada',
        reenvio_correo: false,
      }])

      return NextResponse.json({ ok: true, condiciones_personalizadas: texto || null })
    }

    // Aplicar descuento: Rojas negocia editando la estructura de costos completa.
    if (body.accion === 'aplicar_descuento') {
      if (!(await puedeEditarCotizaciones(supabase, authUser))) {
        return NextResponse.json({ error: 'Solo el director puede aplicar descuentos' }, { status: 403 })
      }
      const { data: cotActual } = await supabase.from('cotizaciones').select('*').eq('id', id).single()
      if (!cotActual) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })

      const est = body.estructura ?? {}
      const L = est.lineas ?? {}
      const num = (x: any) => Math.max(0, Number(x) || 0)
      const precioBase = num(est.precioBase ?? cotActual.precio_base)
      const modalidad = (est.modalidad ?? cotActual.modalidad) as 'contado' | 'credito_24'
      const plan = (est.plan ?? cotActual.plan ?? 'vehimotors') as any
      if (!['contado', 'credito_24'].includes(modalidad)) return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
      // AC500: sus montos vienen del plan (reserva + cuotas), no de líneas de costo.
      // Aplicar un descuento por estructura corrompería las cifras, así que se bloquea.
      if (plan === 'ac500' || cotActual.plan === 'ac500') {
        return NextResponse.json({ error: 'Los descuentos no aplican a cotizaciones Asegúrate con $500. Usa "Editar cotización" o ajusta el plan.' }, { status: 400 })
      }

      const claves = ['placa', 'poliza_vehiculo', 'poliza_vida', 'gastos_vhm', 'honorarios', 'gastos_int', 'alfombras', 'transporte', 'accesorios', 'igtf', 'diferencial'] as const
      const lineas: Record<string, number> = {}
      for (const k of claves) lineas[k] = num(L[k])
      const sumaLineas = claves.reduce((s, k) => s + lineas[k], 0)
      // Para banco, la placa va en el total del vehículo, no en los gastos.
      const gastosEngine = plan === 'banco_100' ? Math.max(0, sumaLineas - lineas.placa) : sumaLineas

      const inicialPct = num(est.inicialPct)
      const tasaPct = num(est.tasaPct)
      const meses = Math.max(1, Math.round(num(est.meses) || 24))

      // Un crédito Vehimotors nunca debe quedar con cuota $0: si no viene en la
      // estructura, se hereda del catálogo (tasa_credito).
      let cuotaVhmDesc = num(est.cuotaVehimotors)
      if (plan === 'vehimotors' && modalidad === 'credito_24' && cuotaVhmDesc <= 0 && cotActual.vehiculo_id) {
        const { data: vehCat } = await supabase
          .from('catalogo_ventas')
          .select('tasa_credito')
          .eq('id', cotActual.vehiculo_id)
          .maybeSingle()
        cuotaVhmDesc = Number(vehCat?.tasa_credito) || 0
      }

      const t = calcularTotalesCotizacion({
        precioBase, modalidad, plan,
        gastos: gastosEngine,
        placaMonto: plan === 'banco_100' ? lineas.placa : undefined,
        tasaBancoPct: tasaPct,
        mesesBanco: meses,
        cuotaVehimotors: cuotaVhmDesc,
        inicialPctVehimotors: inicialPct > 0 ? inicialPct / 100 : undefined,
        mesesVehimotors: meses,
        personalizadoInicialPct: inicialPct > 0 ? inicialPct / 100 : undefined,
        personalizadoMeses: meses,
        personalizadoTasaPct: tasaPct,
      })

      const estructuraGuardar = { precioBase, modalidad, plan, inicialPct, tasaPct, meses, cuotaVehimotors: cuotaVhmDesc, lineas }
      const nuevos = {
        precio_base: precioBase,
        iva_monto: t.iva,
        gastos_monto: t.gastos,
        diferencial_monto: lineas.diferencial > 0 ? lineas.diferencial : null,
        total_inicial: t.totalInicial,
        financiamiento_monto: t.financiamientoMonto,
        cuota_mensual: t.cuotaMensual,
        costo_total: t.costoTotal,
        estructura_costos: estructuraGuardar,
        descuento_solicitado: false,
      }
      const { error: updErr } = await supabase.from('cotizaciones').update(nuevos).eq('id', id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      await supabase.from('cotizacion_ediciones').insert([{
        cotizacion_id: id,
        editado_por: authUser.id,
        editado_por_email: authUser.email ?? null,
        cambios: { descuento: { antes: Number(cotActual.total_inicial) || 0, despues: t.totalInicial } },
        motivo: body.motivo?.trim() || 'Descuento aplicado',
        reenvio_correo: !!body.reenviar_correo,
      }])

      let correoReenviado = false
      if (body.reenviar_correo) {
        try {
          const conces = await getConcesionarioIdentity(supabase, cotActual.concesionario_id ?? null)
          const pdfData: CotizacionPDFData = {
            logoSrc: conces.logoSrc, empresaNombre: conces.nombre, empresaRif: conces.rif,
            empresaDireccion: conces.direccion, empresaTelefono: conces.telefono, empresaCorreo: conces.correo,
            numero: cotActual.numero, fecha: fmtDate(cotActual.fecha), vencimiento: fmtDate(cotActual.vencimiento),
            clienteNombre: cotActual.cliente_nombre, clienteCiRif: cotActual.cliente_ci_rif,
            clienteDireccion: cotActual.cliente_direccion, clienteCorreo: cotActual.cliente_correo,
            clienteTelefono: cotActual.cliente_telefono, clienteCiudadEstado: cotActual.cliente_ciudad_estado,
            clienteCodigoPostal: cotActual.cliente_codigo_postal, agenteRetencion: !!cotActual.agente_retencion,
            marca: cotActual.marca, modelo: cotActual.modelo, cantidad: Number(cotActual.cantidad) || 1,
            precioBase, modalidad, plan, ivaMonto: t.iva, gastosMonto: t.gastos,
            totalVehiculo: plan === 'banco_100' ? (t.totalVehiculoBanco ?? undefined) : undefined,
            totalInicial: t.totalInicial, financiamientoMonto: t.financiamientoMonto, cuotaMensual: t.cuotaMensual,
            mesesBanco: plan === 'banco_100' ? meses : undefined,
            inicialPct: plan === 'personalizado' ? inicialPct / 100 : undefined,
            mesesCredito: plan === 'personalizado' ? meses : undefined,
            costoTotal: t.costoTotal,
            condicionesPersonalizadas: cotActual.condiciones_personalizadas ?? null,
          }
          await enviarCotizacionCliente(pdfData, cotActual.token_respuesta, id)
          correoReenviado = true
        } catch (e: any) {
          console.error('[aplicar_descuento] reenvio error:', e?.message)
        }
      }

      return NextResponse.json({ ok: true, totalInicial: t.totalInicial, costoTotal: t.costoTotal, correoReenviado })
    }

    // Editar montos (compatibilidad con la acción anterior)
    if (body.accion === 'editar_montos') {
      if (!(await puedeEditarCotizaciones(supabase, authUser))) {
        return NextResponse.json({ error: 'Solo el director puede editar cotizaciones' }, { status: 403 })
      }
      const { precio_base, gastos_monto, cuota_mensual, modalidad, plan } = body

      if (typeof precio_base !== 'number' || precio_base <= 0)
        return NextResponse.json({ error: 'Precio base inválido' }, { status: 400 })
      if (typeof gastos_monto !== 'number' || gastos_monto < 0)
        return NextResponse.json({ error: 'Gastos inválidos' }, { status: 400 })
      if (!['contado', 'credito_24'].includes(modalidad))
        return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
      if (!['vehimotors', 'banco_100'].includes(plan))
        return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

      const iva_monto = precio_base * 0.16
      let total_inicial: number
      let financiamiento_monto: number | null = null
      let cuota_mensual_final: number | null = null
      let costo_total: number

      if (modalidad === 'contado') {
        total_inicial = precio_base + iva_monto + gastos_monto
        costo_total = total_inicial
      } else if (plan === 'banco_100') {
        const totalVeh = precio_base + iva_monto
        total_inicial = totalVeh * 0.30 + gastos_monto
        financiamiento_monto = totalVeh * 0.70
        cuota_mensual_final = typeof cuota_mensual === 'number' ? cuota_mensual : null
        costo_total = total_inicial + (cuota_mensual_final ?? 0) * 24
      } else {
        total_inicial = precio_base * 0.4 + iva_monto + gastos_monto
        financiamiento_monto = precio_base * 0.6
        cuota_mensual_final = typeof cuota_mensual === 'number' ? cuota_mensual : null
        costo_total = total_inicial + (cuota_mensual_final ?? 0) * 24
      }

      const { error } = await supabase
        .from('cotizaciones')
        .update({
          precio_base, iva_monto, gastos_monto, modalidad, plan,
          total_inicial, financiamiento_monto,
          cuota_mensual: cuota_mensual_final, costo_total,
        })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        ok: true,
        data: { precio_base, iva_monto, gastos_monto, modalidad, plan, total_inicial, financiamiento_monto, cuota_mensual: cuota_mensual_final, costo_total }
      })
    }

    // Cambiar estado
    const { estado, motivo_rechazo } = body
    if (!['aceptada', 'rechazada', 'sin_respuesta', 'pospuesta'].includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    if (estado === 'rechazada' && !motivo_rechazo?.trim()) {
      return NextResponse.json({ error: 'Se requiere motivo de rechazo' }, { status: 400 })
    }

    const { error } = await supabase
      .from('cotizaciones')
      .update({
        estado,
        motivo_rechazo: estado === 'rechazada' ? motivo_rechazo.trim() : null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cotizaciones/patch] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
