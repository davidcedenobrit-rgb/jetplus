export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { permitido } from '@/lib/rate-limit'
import { calcularTotalesCotizacion } from '@/lib/cotizacion-calc'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Rate limit: máx. 20 cotizaciones por minuto por usuario (genera PDF + envía correo)
    if (!(await permitido(`cotizacion:${authUser.id}`, 20, 60))) {
      return NextResponse.json({ error: 'Demasiadas cotizaciones seguidas. Espera un momento.' }, { status: 429 })
    }

    const body = await req.json()
    const {
      codigo,
      vehiculoId,
      clienteNombre,
      clienteCiRif,
      clienteCorreo,
      clienteTelefono,
      clienteDireccion,
      clienteCiudadEstado,
      clienteCodigoPostal,
      agenteRetencion,
      modalidad,
      plan: planBody,
      ac500PlanId,
      ac500Meses: ac500MesesBody,
      cantidad,
      concesionarioId,
      promoVehiculoId,
      // Plan Personalizado (lo arma Rojas al cotizar)
      personalizadoInicialPct,
      personalizadoMeses,
      personalizadoTasaPct,
      personalizadoDiferencial,
      // Rojas Personalizada: Rojas edita el precio base y la estructura de gastos
      // del carro seleccionado y adjunta una propuesta de condiciones libre.
      precioBaseOverride,
      gastosOverride,
      condicionesPersonalizadas,
      // Banca Nacional — Vehimotors (desde la bandeja): % aprobado por el banco y
      // % de merma del día que coloca Rojas.
      bnVehimotors,
    } = body

    const condPersonalizadas = String(condicionesPersonalizadas ?? '').trim() || null
    const precioOverride = precioBaseOverride != null ? Number(precioBaseOverride) : null
    const gastosOverrideNum = gastosOverride != null ? Number(gastosOverride) : null

    // Parámetros del plan Personalizado (saneados)
    const persIniPct = Math.min(100, Math.max(0, Number(personalizadoInicialPct)))
    const persMeses = Math.max(1, Math.round(Number(personalizadoMeses) || 24))
    const persTasaPct = Math.max(0, Number(personalizadoTasaPct) || 0)
    const persDiferencial = personalizadoDiferencial === true || personalizadoDiferencial === 'true'

    // Las promociones especiales solo cotizan Contado o Crédito 24 (Vehimotors)
    let plan = planBody ?? 'vehimotors'
    if (promoVehiculoId) plan = 'vehimotors'

    // Cantidad de vehículos (entero >= 1), independiente del stock de showroom
    const cantidadNum = Math.max(1, Math.floor(Number(cantidad) || 1))

    // Validaciones básicas (el correo del cliente es opcional).
    if (!codigo || (!vehiculoId && !promoVehiculoId) || !clienteNombre?.trim() || !clienteCiRif?.trim() || !modalidad) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const correoCliente = clienteCorreo?.trim().toLowerCase() || ''
    if (!['contado', 'credito_24'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (!['vehimotors', 'banco_100', 'ac500', 'personalizado', 'banca_nacional'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    if (plan === 'ac500' && (!ac500PlanId || !ac500MesesBody)) {
      return NextResponse.json({ error: 'Plan AC500 incompleto' }, { status: 400 })
    }
    // El plan Personalizado es una modalidad a crédito (inicial + cuotas).
    if (plan === 'personalizado') {
      if (modalidad !== 'credito_24') {
        return NextResponse.json({ error: 'El plan personalizado se cotiza a crédito' }, { status: 400 })
      }
      if (!(persIniPct >= 0 && persIniPct < 100)) {
        return NextResponse.json({ error: 'Inicial del plan personalizado inválido' }, { status: 400 })
      }
    }
    if (!/^[A-Za-z]\d{3}$/.test(String(codigo).trim())) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Concesionario del encabezado. Solo el código de la casa (R000) puede
    // cotizar para otro concesionario; el resto de vendedoras siempre va a La
    // Oriental. Además debe ser un concesionario ACTIVO.
    const esCodigoCasa = String(codigo || '').trim().toUpperCase() === 'R000'
    let concIdSolicitado: string | null = concesionarioId ?? null
    if (!esCodigoCasa) concIdSolicitado = 'la-oriental'
    if (concIdSolicitado && concIdSolicitado !== 'la-oriental') {
      const { data: cRow } = await supabase
        .from('concesionarios')
        .select('activo')
        .eq('id', concIdSolicitado)
        .maybeSingle()
      if (!cRow || !cRow.activo) concIdSolicitado = 'la-oriental'
    }
    const conces = await getConcesionarioIdentity(supabase, concIdSolicitado)

    // Verificar vendedora. El código interno de la casa (R000) siempre es
    // válido: lo usa el generador del Centro de Mando y no debe depender del
    // interruptor de "activa" (que sí aplica a las vendedoras públicas).
    const CODIGO_CASA = 'R000'
    const codigoTrim = String(codigo).trim()
    const { data: vendedora } = await supabase
      .from('vendedoras')
      .select('nombre, activa')
      .eq('codigo', codigoTrim)
      .single()

    if (!vendedora || (!vendedora.activa && codigoTrim !== CODIGO_CASA)) {
      return NextResponse.json({ error: 'Código de vendedora inválido' }, { status: 401 })
    }

    // Obtener vehículo — desde una promoción especial o del catálogo normal.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let vehiculo: any
    let vehiculoIdGuardar: string | null = vehiculoId ?? null

    if (promoVehiculoId) {
      const { data: promo } = await supabase
        .from('promocion_vehiculos')
        .select('vehiculo_id, marca, modelo, precio_base, gastos_contado, gastos_credito, cuota_mensual')
        .eq('id', promoVehiculoId)
        .single()
      if (!promo) {
        return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })
      }
      // Se mapea a la forma de catálogo para reusar el mismo cálculo (Vehimotors):
      // gc = gastos contado, gcr = gastos crédito, tasa_credito = cuota mensual.
      vehiculo = {
        brand: promo.marca, model: promo.modelo,
        cash: Number(promo.precio_base) || 0,
        gc: Number(promo.gastos_contado) || 0,
        gcr: Number(promo.gastos_credito) || 0,
        tasa_credito: Number(promo.cuota_mensual) || 0,
        placa_monto: null, poliza_vehiculo_banco: null, poliza_vida_banco: null,
        honorarios_banco: null, gastos_internos_banco: null, alfombras_banco: null,
        diferencial_pct: null, tasa_banco_pct: null,
      }
      vehiculoIdGuardar = promo.vehiculo_id ?? null
    } else {
      const { data: v } = await supabase
        .from('catalogo_ventas')
        .select('brand, model, cash, gc, gcr, tasa_credito, placa_monto, poliza_vehiculo_banco, poliza_vida_banco, honorarios_banco, gastos_internos_banco, alfombras_banco, transporte_banco, accesorios_banco, igtf_banco, diferencial_pct, tasa_banco_pct, cuotas_banco, diferencial_c_activo, diferencial_cr_activo, diferencial_banco_activo')
        .eq('id', vehiculoId)
        .single()
      if (!v) {
        return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })
      }
      vehiculo = v
    }

    // Precio base: normalmente del catálogo; Rojas Personalizada puede sobreescribirlo.
    const precioBase = (precioOverride != null && precioOverride > 0) ? precioOverride : (Number(vehiculo.cash) || 0)
    const iva = precioBase * 0.16

    // AC500 plan lookup
    let ac500Schedule: AC500ScheduleData | null = null
    const ac500Meses = ac500MesesBody ? Number(ac500MesesBody) : null

    if (plan === 'ac500' && ac500PlanId) {
      const { data: planRow } = await supabase
        .from('planes_ac500')
        .select('cuota_0, cuota_1, cuota_2, cuota_3, cuota_4, cuota_5, cuota_6, cuota_7, cuota_8, cuota_9, total, modelo, meses')
        .eq('id', ac500PlanId)
        .eq('activo', true)
        .single()
      if (!planRow) {
        return NextResponse.json({ error: 'Plan AC500 no encontrado' }, { status: 404 })
      }
      const n = Number(planRow.meses)
      const cuotas: AC500CuotaItem[] = []
      for (let i = 1; i <= n; i++) {
        cuotas.push({
          label: i === n ? `Cuota ${i} (Entrega)` : `Cuota ${i}`,
          monto: Number((planRow as Record<string, unknown>)[`cuota_${i}`]) || 0,
        })
      }
      ac500Schedule = {
        reserva: Number(planRow.cuota_0) || 500,
        meses: n,
        modelo: String(planRow.modelo ?? ''),
        cuotas,
        total: Number(planRow.total) || 0,
      }
    }

    // Diferencial cambiario. El % sale de las tasas globales (BCV y USDT):
    //   % = (USDT - BCV) / BCV
    // Disponible en las 3 modalidades; se activa por vehículo (Rojas decide).
    //   · Banco: sobre el monto financiado (70%) — comportamiento histórico.
    //   · Contado / Crédito Vehimotors: sobre el precio base del vehículo.
    let diferencial = 0
    let totalVehiculoBanco = 0

    const difBancoOn   = plan === 'banco_100' && modalidad === 'credito_24' && vehiculo.diferencial_banco_activo !== false
    const difContadoOn = plan === 'vehimotors' && modalidad === 'contado' && vehiculo.diferencial_c_activo === true
    const difCreditoOn = plan === 'vehimotors' && modalidad === 'credito_24' && vehiculo.diferencial_cr_activo === true
    // Personalizado: el diferencial es un interruptor por cotización (lo prende Rojas).
    const difPersonalizadoOn = plan === 'personalizado' && persDiferencial

    if (difBancoOn || difContadoOn || difCreditoOn || difPersonalizadoOn) {
      const { data: cfgTasas } = await supabase
        .from('config_cotizaciones')
        .select('clave, valor')
        .in('clave', ['tasa_bcv', 'tasa_usdt'])
      const tasaBcv  = Number(cfgTasas?.find(c => c.clave === 'tasa_bcv')?.valor) || 0
      const tasaUsdt = Number(cfgTasas?.find(c => c.clave === 'tasa_usdt')?.valor) || 0
      const difPct = (tasaBcv > 0 && tasaUsdt > tasaBcv) ? (tasaUsdt - tasaBcv) / tasaBcv : 0

      if (difBancoOn) {
        const placaMonto = Number(vehiculo.placa_monto) || 400
        totalVehiculoBanco = precioBase + iva + placaMonto
        const financiamientoBanco = totalVehiculoBanco * 0.70
        diferencial = financiamientoBanco * difPct
      } else if (difPersonalizadoOn) {
        // Sobre el monto financiado del plan personalizado.
        diferencial = precioBase * (1 - persIniPct / 100) * difPct
      } else {
        diferencial = precioBase * difPct
      }
    }

    // El plan banco necesita totalVehiculoBanco aunque el diferencial esté apagado.
    if (plan === 'banco_100' && modalidad === 'credito_24' && totalVehiculoBanco === 0) {
      const placaMonto = Number(vehiculo.placa_monto) || 400
      totalVehiculoBanco = precioBase + iva + placaMonto
    }

    let gastosBase: number
    if (plan === 'banco_100' && modalidad === 'credito_24') {
      gastosBase =
        (Number(vehiculo.poliza_vehiculo_banco) || 0) +
        (Number(vehiculo.poliza_vida_banco) || 0) +
        (Number(vehiculo.honorarios_banco) || 0) +
        (Number(vehiculo.gastos_internos_banco) || 0) +
        (Number(vehiculo.alfombras_banco) || 0) +
        (Number(vehiculo.transporte_banco) || 0) +
        (Number(vehiculo.accesorios_banco) || 0) +
        (Number(vehiculo.igtf_banco) || 0)
    } else if (plan === 'ac500') {
      gastosBase = 0
    } else if (modalidad === 'contado') {
      gastosBase = Number(vehiculo.gc) || 0
    } else {
      gastosBase = Number(vehiculo.gcr) || 0
    }
    // Gastos: normalmente base por modalidad + diferencial; Rojas Personalizada
    // envía el total ya editado (que puede incluir su propio diferencial).
    const gastos = (gastosOverrideNum != null && gastosOverrideNum >= 0) ? gastosOverrideNum : (gastosBase + diferencial)

    // Meses del plan 100% Banco (editable por vehículo; por defecto 24)
    const mesesBanco = Math.max(1, Math.round(Number((vehiculo as { cuotas_banco?: number | null }).cuotas_banco) || 24))

    // Motor de cálculo único (mismo que usan editar y reactivar)
    const totales = calcularTotalesCotizacion({
      precioBase,
      modalidad,
      plan,
      gastos,
      placaMonto: Number(vehiculo.placa_monto) || 400,
      tasaBancoPct: Number(vehiculo.tasa_banco_pct) || 16,
      mesesBanco,
      cuotaVehimotors: Number(vehiculo.tasa_credito) || 0,
      ac500: (plan === 'ac500' && ac500Schedule)
        ? { reserva: ac500Schedule.reserva, total: ac500Schedule.total }
        : null,
      personalizadoInicialPct: persIniPct / 100,
      personalizadoMeses: persMeses,
      personalizadoTasaPct: persTasaPct,
    })
    let totalInicial = totales.totalInicial
    let financiamientoMonto = totales.financiamientoMonto
    let cuotaMensual = totales.cuotaMensual
    let costoTotal = totales.costoTotal

    // Banca Nacional — Vehimotors: el banco aprueba un % del total (base+IVA+placa),
    // pagado en Bs a BCV; con la merma del día se obtiene el valor real en dólares, y
    // el cliente cubre la diferencia + gastos como inicial para llevarse el carro.
    let bnVehimotorsData: any = null
    if (plan === 'banca_nacional' && bnVehimotors && Number(bnVehimotors.aprobadoPct) > 0) {
      const placaMonto = Number(bnVehimotors.placaMonto) || Number(vehiculo.placa_monto) || 400
      const totalBanco = precioBase + iva + placaMonto
      const aprobadoPct = Math.min(100, Math.max(0, Number(bnVehimotors.aprobadoPct)))
      const mermaPct = Math.min(100, Math.max(0, Number(bnVehimotors.mermaPct)))
      const aprobadoBanco = totalBanco * (aprobadoPct / 100)
      const aprobadoReal = aprobadoBanco * (1 - mermaPct / 100)
      const diferencial = aprobadoBanco - aprobadoReal
      const inicialCliente = totalBanco - aprobadoReal + gastos
      totalInicial = inicialCliente
      financiamientoMonto = null
      cuotaMensual = null
      costoTotal = inicialCliente
      bnVehimotorsData = {
        precio_base: precioBase, iva, placa: placaMonto, gastos,
        total_banco: totalBanco, aprobado_pct: aprobadoPct, aprobado_banco: aprobadoBanco,
        merma_pct: mermaPct, aprobado_real: aprobadoReal, diferencial, inicial_cliente: inicialCliente,
        banco: (typeof bnVehimotors.banco === 'string' && bnVehimotors.banco.trim()) ? bnVehimotors.banco.trim() : null,
      }
    }

    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 3)

    // Vincular cliente_id si ya existe un cliente con esta CI/RIF
    const ciNorm = clienteCiRif.trim().toUpperCase()
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .ilike('cedula_rif', ciNorm)
      .limit(1)
      .maybeSingle()
    const clienteIdVinculado = clienteExistente?.id ?? null

    // Insertar cotización (trigger auto-genera numero y numero_seq)
    const { data: cot, error: insertError } = await supabase
      .from('cotizaciones')
      .insert([{
        fecha: hoy.toISOString().slice(0, 10),
        vencimiento: venc.toISOString().slice(0, 10),
        vendedora_nombre: vendedora.nombre,
        concesionario_id: conces.id,
        cliente_id: clienteIdVinculado,
        cliente_nombre: clienteNombre.trim(),
        cliente_ci_rif: clienteCiRif.trim(),
        cliente_correo: correoCliente,
        cliente_telefono: clienteTelefono?.trim() || null,
        cliente_direccion: clienteDireccion?.trim() || null,
        cliente_ciudad_estado: clienteCiudadEstado?.trim() || null,
        cliente_codigo_postal: clienteCodigoPostal?.trim() || null,
        agente_retencion: !!agenteRetencion,
        vehiculo_id: vehiculoIdGuardar,
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        cantidad: cantidadNum,
        precio_base: precioBase,
        modalidad,
        plan,
        iva_monto: iva,
        gastos_monto: gastos,
        diferencial_monto: diferencial > 0 ? diferencial : null,
        tasa_bcv_snap: null,
        tasa_vhm_snap: null,
        total_inicial: totalInicial,
        financiamiento_monto: financiamientoMonto,
        cuota_mensual: cuotaMensual,
        costo_total: costoTotal,
        ac500_meses: plan === 'ac500' ? ac500Meses : null,
        ac500_cuotas: plan === 'ac500' && ac500Schedule ? ac500Schedule.cuotas.map(c => c.monto) : null,
        cuotas_banco: plan === 'banco_100' ? mesesBanco : null,
        personalizado_inicial_pct: plan === 'personalizado' ? persIniPct : null,
        personalizado_meses: plan === 'personalizado' ? persMeses : null,
        personalizado_tasa_pct: plan === 'personalizado' ? persTasaPct : null,
        personalizado_diferencial: plan === 'personalizado' ? persDiferencial : false,
        condiciones_personalizadas: condPersonalizadas,
        bn_vehimotors: bnVehimotorsData,
      }])
      .select()
      .single()

    if (insertError || !cot) {
      console.error('[cotizaciones] insert error:', insertError)
      return NextResponse.json({ error: 'Error al guardar la cotización' }, { status: 500 })
    }

    const pdfData: CotizacionPDFData = {
      logoSrc: conces.logoSrc,
      empresaNombre: conces.nombre,
      empresaRif: conces.rif,
      empresaDireccion: conces.direccion,
      empresaTelefono: conces.telefono,
      empresaCorreo: conces.correo,
      numero: cot.numero,
      fecha: fmtDate(hoy),
      vencimiento: fmtDate(venc),
      clienteNombre: clienteNombre.trim(),
      clienteCiRif: clienteCiRif.trim(),
      clienteDireccion: clienteDireccion?.trim() || null,
      clienteCorreo: correoCliente,
      clienteTelefono: clienteTelefono?.trim() || null,
      clienteCiudadEstado: clienteCiudadEstado?.trim() || null,
      clienteCodigoPostal: clienteCodigoPostal?.trim() || null,
      agenteRetencion: !!agenteRetencion,
      marca: vehiculo.brand,
      modelo: vehiculo.model,
      cantidad: cantidadNum,
      precioBase,
      modalidad,
      plan,
      ivaMonto: iva,
      gastosMonto: gastos,
      totalVehiculo: plan === 'banco_100' ? totalVehiculoBanco : undefined,
      totalInicial,
      financiamientoMonto,
      cuotaMensual,
      mesesBanco: plan === 'banco_100' ? mesesBanco : undefined,
      costoTotal,
      ac500Schedule: plan === 'ac500' && ac500Schedule ? ac500Schedule : undefined,
      inicialPct: plan === 'personalizado' ? persIniPct / 100 : undefined,
      mesesCredito: plan === 'personalizado' ? persMeses : undefined,
      condicionesPersonalizadas: condPersonalizadas,
      bnVehimotors: bnVehimotorsData,
    }

    // Enviar emails (ambos en paralelo, errores no bloqueantes).
    // El correo al cliente solo se envía si dejó su correo (ahora es opcional).
    const emailResults = await Promise.allSettled([
      correoCliente ? enviarCotizacionCliente(pdfData, cot.token_respuesta, cot.id) : Promise.resolve(null),
      enviarNotificacionRojas({
        numero: cot.numero,
        vendedoraNombre: vendedora.nombre,
        clienteNombre: clienteNombre.trim(),
        clienteCorreo: correoCliente,
        clienteCiRif: clienteCiRif.trim(),
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        modalidad,
        plan,
        totalInicial,
        cuotaMensual,
        costoTotal,
        fecha: fmtDate(hoy),
        ac500Schedule: plan === 'ac500' && ac500Schedule ? ac500Schedule : undefined,
      }),
    ])

    emailResults.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[cotizaciones] email ${i} error:`, r.reason)
    })

    return NextResponse.json({ ok: true, numero: cot.numero, id: cot.id }, { status: 201 })
  } catch (err) {
    console.error('[cotizaciones] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, vencimiento, vendedora_nombre, concesionario_id, cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, agente_retencion, marca, modelo, modalidad, plan, precio_base, iva_monto, gastos_monto, financiamiento_monto, cuota_mensual, total_inicial, costo_total, estado, motivo_rechazo, descuento_solicitado, motivo_descuento, condiciones_personalizadas, created_at, resend_email_id, email_ultimo_estado, email_ultimo_evento_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
