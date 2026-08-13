export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { sedesExternas } from '@/lib/cotizacion-federada'
import { enviarCotizacionCliente, enviarNotificacionRojas } from '@/lib/email-cotizaciones'
import { CotizacionPDF } from '@/lib/cotizacion-pdf'
import type { CotizacionPDFData, AC500ScheduleData, AC500CuotaItem } from '@/lib/cotizacion-pdf'
import { getConcesionarioIdentity } from '@/lib/concesionario'
import { permitido } from '@/lib/rate-limit'
import { calcularTotalesCotizacion, calcularPresupuestoJetplus } from '@/lib/cotizacion-calc'

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function POST(req: Request) {
  try {
    // La cotización desde el link de vendedores se autoriza por el CÓDIGO de la
    // vendedora (se valida más abajo contra la tabla `vendedoras`), NO por sesión:
    // los vendedores usan el link público sin estar logueados. Si hay sesión de
    // staff, se aprovecha solo para el rate limit.
    const authClient = await createClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()

    const body = await req.json()

    // Rate limit: 20/min por vendedora (o por usuario si hay sesión de staff).
    const rlKey = authUser?.id
      ?? (typeof body?.codigo === 'string' && body.codigo.trim() ? `cod:${body.codigo.trim().toUpperCase()}` : 'anon')
    if (!(await permitido(`cotizacion:${rlKey}`, 20, 60))) {
      return NextResponse.json({ error: 'Demasiadas cotizaciones seguidas. Espera un momento.' }, { status: 429 })
    }

    const {
      // Vista previa: genera el PDF con los datos actuales SIN guardar la
      // cotización ni enviar correos (para que la vendedora lo revise/comparta).
      preview,
      // "Guardar primero": crea la cotización pero NO envía el correo al cliente
      // (queda registrada para revisarla y enviarla luego desde el panel).
      // Por defecto true (comportamiento anterior: crear y enviar).
      enviarAlCliente,
      codigo,
      vehiculoId,
      clienteNombre,
      clienteCiRif,
      clienteCorreo,
      clienteTelefono,
      clienteDireccion,
      clienteCiudadEstado,
      clienteCodigoPostal,
      clienteCedula,
      clienteRif,
      color,
      agenteRetencion,
      retencionPct,
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
      // Rojas Personalizada: líneas de la estructura de costos (para persistir el
      // desglose por línea, no solo el total).
      estructuraLineas,
      condicionesPersonalizadas,
      // Banca Nacional: banco del crédito (para estadísticas).
      banco,
      // Banca Nacional — Vehimotors (desde la bandeja): % aprobado por el banco y
      // % de merma del día que coloca Rojas.
      bnVehimotors,
      // Vendedora(s) atribuidas cuando Rojas cotiza desde el panel. Arreglo de
      // códigos de la tabla `vendedoras`. En el link público no se envía: la
      // vendedora ya viene identificada por su propio código.
      vendedorasCodigos,
      // Modelo real de Jetplus (plan === 'presupuesto'): descuento discrecional
      // (por % o por monto fijo — descuentoMonto manda si viene > 0), % de
      // inicial (100 = contado), financiadora elegida y cargos seleccionables.
      descuentoPct,
      descuentoMonto,
      inicialPct: inicialPctBody,
      financiadoraId,
      cargoGastosAdmin,
      cargoPlaca,
    } = body

    const condPersonalizadas = String(condicionesPersonalizadas ?? '').trim() || null
    const bancoCot = (typeof banco === 'string' && banco.trim())
      ? banco.trim()
      : (typeof bnVehimotors?.banco === 'string' && bnVehimotors.banco.trim() ? bnVehimotors.banco.trim() : null)
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
    // AC500 puede cotizarse directo (sin carro del catálogo) usando el plan.
    const ac500Directo = plan === 'ac500' && ac500PlanId && !vehiculoId
    const esPresupuesto = plan === 'presupuesto'
    if (!codigo || (!vehiculoId && !promoVehiculoId && !ac500Directo) || !clienteNombre?.trim() || !clienteCiRif?.trim() || (!esPresupuesto && !modalidad)) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const correoCliente = clienteCorreo?.trim().toLowerCase() || ''
    // Si enviarAlCliente === false → se guarda sin mandarle el correo al cliente.
    const debeEnviarCliente = enviarAlCliente !== false
    // El presupuesto Jetplus no usa "modalidad" (contado/crédito lo define el
    // % de inicial), así que no exige el campo.
    if (!esPresupuesto && !['contado', 'credito_24'].includes(modalidad)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    if (!['vehimotors', 'banco_100', 'ac500', 'personalizado', 'banca_nacional', 'presupuesto'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }
    if (esPresupuesto) {
      const ip = Number(inicialPctBody)
      if (!(ip >= 1 && ip <= 100)) {
        return NextResponse.json({ error: 'Inicial % inválido' }, { status: 400 })
      }
      if (ip < 100 && !financiadoraId) {
        return NextResponse.json({ error: 'Selecciona la financiadora' }, { status: 400 })
      }
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

    // Concesionario del encabezado. Cada sede tiene su propia base; el
    // predeterminado es el concesionario LOCAL (config o principal), no La
    // Oriental. Solo el código de la casa (R000) puede cotizar para otro.
    async function resolverConcLocal(): Promise<string | null> {
      const { data: cfg } = await supabase.from('config_cotizaciones').select('valor').eq('clave', 'concesionario_id').maybeSingle()
      if (cfg?.valor) return String(cfg.valor)
      const { data: prin } = await supabase.from('concesionarios').select('id').eq('es_principal', true).limit(1).maybeSingle()
      return prin?.id ?? 'jetplus'
    }
    const esCodigoCasa = String(codigo || '').trim().toUpperCase() === 'R000'
    const concLocal = await resolverConcLocal()
    let concIdSolicitado: string | null = esCodigoCasa ? (concesionarioId ?? concLocal) : concLocal
    if (concIdSolicitado && concIdSolicitado !== concLocal) {
      const { data: cRow } = await supabase
        .from('concesionarios')
        .select('activo')
        .eq('id', concIdSolicitado)
        .maybeSingle()
      if (!cRow || !cRow.activo) concIdSolicitado = concLocal
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

    // Vendedora(s) que se atribuyen la venta. Desde el panel de Rojas pueden
    // seleccionarse una o varias; desde el link público se usa la que verificó
    // su código. `vendedora_nombre` (texto) guarda los nombres unidos; el
    // arreglo `vendedoras` guarda la estructura [{ codigo, nombre }].
    const codigosSel = Array.isArray(vendedorasCodigos)
      ? [...new Set(vendedorasCodigos.map((c: unknown) => String(c).trim()).filter(Boolean))]
      : []
    let vendedorasList: Array<{ codigo: string; nombre: string }> = []
    if (codigosSel.length) {
      const { data: vs } = await supabase
        .from('vendedoras')
        .select('codigo, nombre')
        .in('codigo', codigosSel)
      vendedorasList = (vs ?? []).map((v: { codigo: string; nombre: string }) => ({ codigo: v.codigo, nombre: v.nombre }))
    }
    if (!vendedorasList.length) vendedorasList = [{ codigo: codigoTrim, nombre: vendedora.nombre }]
    const vendedoraNombreFinal = vendedorasList.map(v => v.nombre).join(', ')

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
    } else if (ac500Directo) {
      // AC500 directo: el modelo sale del plan AC500 (ac500_vehiculos), sin carro del catálogo.
      const { data: acv } = await supabase.from('ac500_vehiculos').select('brand, model').eq('id', ac500PlanId).single()
      if (!acv) return NextResponse.json({ error: 'Plan AC500 no encontrado' }, { status: 404 })
      vehiculo = {
        brand: acv.brand, model: acv.model, cash: 0, gc: 0, gcr: 0, tasa_credito: 0,
        placa_monto: null, poliza_vehiculo_banco: null, poliza_vida_banco: null,
        honorarios_banco: null, gastos_internos_banco: null, alfombras_banco: null,
        diferencial_pct: null, tasa_banco_pct: null, cuotas_banco: null,
      }
      vehiculoIdGuardar = null
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
    // Jetplus: exonerado de IVA (Puerto Libre de Margarita).
    const iva = precioBase * 0

    // AC500 plan lookup
    let ac500Schedule: AC500ScheduleData | null = null
    const ac500Meses = ac500MesesBody ? Number(ac500MesesBody) : null

    if (plan === 'ac500' && ac500PlanId) {
      // Fuente de verdad del AC500 = ac500_vehiculos (lo que edita Rojas).
      const n = ac500Meses && [6, 9, 12].includes(ac500Meses) ? ac500Meses : 6
      const { data: v } = await supabase
        .from('ac500_vehiculos')
        .select('*')
        .eq('id', ac500PlanId)
        .single()
      if (!v) {
        return NextResponse.json({ error: 'Plan AC500 no encontrado' }, { status: 404 })
      }
      const row = v as Record<string, unknown>
      const pref = `p${n}_`
      const cuotas: AC500CuotaItem[] = []
      for (let i = 1; i <= n; i++) {
        cuotas.push({
          label: i === n ? `Cuota ${i} (Entrega)` : `Cuota ${i}`,
          monto: Number(row[`${pref}c${i}`]) || 0,
        })
      }
      ac500Schedule = {
        reserva: Number(row.reserva) || 500,
        meses: n,
        modelo: String(row.model ?? ''),
        cuotas,
        total: Number(row[`${pref}total`]) || 0,
      }
    }

    let diferencial = 0
    let totalVehiculoBanco = 0
    let gastos = 0
    let totalInicial = 0
    let financiamientoMonto: number | null = null
    let cuotaMensual: number | null = null
    let costoTotal = 0
    const mesesBanco = Math.max(1, Math.round(Number((vehiculo as { cuotas_banco?: number | null }).cuotas_banco) || 24))

    // Presupuesto de descuento_pct/igtf_monto/financiadora/comisión/cargos,
    // guardados aparte para el PDF y el panel.
    let presupuestoInicialPct = 100
    let presupuestoDescuentoPct = 0
    let presupuestoIgtf = 0
    let presupuestoComision = 0
    let presupuestoFinanciadoraNombre: string | null = null
    let presupuestoCargoGastosAdmin = false
    let presupuestoCargoPlaca = false

    if (esPresupuesto) {
      // Modelo real de Jetplus Margarita (confirmado contra proformas reales):
      // descuento discrecional + IGTF 3% + inicial % (100 = contado) + comisión
      // de la financiadora sobre la inicial + cargos seleccionables.
      presupuestoInicialPct = Math.min(100, Math.max(1, Number(inicialPctBody)))
      presupuestoCargoGastosAdmin = !!cargoGastosAdmin
      presupuestoCargoPlaca = !!cargoPlaca
      let financiadoraTasaPct = 0
      if (presupuestoInicialPct < 100 && financiadoraId) {
        const { data: fin } = await supabase.from('financiadoras').select('nombre, tasa_comision_pct').eq('id', financiadoraId).maybeSingle()
        financiadoraTasaPct = Number(fin?.tasa_comision_pct) || 0
        presupuestoFinanciadoraNombre = fin?.nombre ?? null
      }
      const pres = calcularPresupuestoJetplus({
        precioLista: precioBase,
        descuentoPct: Math.min(100, Math.max(0, Number(descuentoPct) || 0)),
        descuentoMonto: Math.max(0, Number(descuentoMonto) || 0),
        inicialPct: presupuestoInicialPct,
        financiadoraTasaPct,
        cargoGastosAdmin: presupuestoCargoGastosAdmin,
        cargoPlaca: presupuestoCargoPlaca,
        gastosAdminMonto: Number(vehiculo.gc) || 500,
        placaMonto: Number(vehiculo.placa_monto) || 390,
      })
      // Se guarda el % EFECTIVO (aunque la vendedora haya elegido monto fijo),
      // para que el PDF y los reportes siempre muestren un descuento_pct coherente.
      presupuestoDescuentoPct = pres.descuentoPct
      presupuestoIgtf = pres.igtf
      presupuestoComision = pres.comisionFlat
      gastos = pres.cargos
      totalInicial = pres.totalInicialAPagar
      financiamientoMonto = pres.esContado ? null : pres.saldoFinanciar
      cuotaMensual = null
      costoTotal = pres.totalInicialAPagar
    } else {
      // Diferencial cambiario. El % sale de las tasas globales (BCV y USDT):
      //   % = (USDT - BCV) / BCV
      // Disponible en las 3 modalidades; se activa por vehículo (Rojas decide).
      //   · Banco: sobre el monto financiado (70%) — comportamiento histórico.
      //   · Contado / Crédito Vehimotors: sobre el precio base del vehículo.
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
      gastos = (gastosOverrideNum != null && gastosOverrideNum >= 0) ? gastosOverrideNum : (gastosBase + diferencial)

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
      totalInicial = totales.totalInicial
      financiamientoMonto = totales.financiamientoMonto
      cuotaMensual = totales.cuotaMensual
      costoTotal = totales.costoTotal
    }

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
        financ_meses: Number(bnVehimotors.financMeses) || 0,
        financ_tasa: Number(bnVehimotors.financTasa) || 0,
        financ_cuota: Number(bnVehimotors.financCuota) || 0,
      }
    }

    // El presupuesto Jetplus no usa "modalidad" en el formulario (lo define el
    // % de inicial); se guarda un valor equivalente por compatibilidad con las
    // columnas/reportes existentes.
    const modalidadFinal: 'contado' | 'credito_24' = esPresupuesto
      ? (presupuestoInicialPct >= 100 ? 'contado' : 'credito_24')
      : modalidad

    const hoy = new Date()
    const venc = new Date(hoy)
    venc.setDate(venc.getDate() + 3)

    // ── VISTA PREVIA ──────────────────────────────────────────────────────
    // Devuelve el PDF con los datos actuales sin guardar la cotización ni
    // enviar correos. Reutiliza exactamente el mismo cálculo del flujo normal.
    if (preview) {
      const previewData: CotizacionPDFData = {
        logoSrc: conces.logoSrc,
        selloSrc: conces.selloSrc,
        empresaNombre: conces.nombre,
        empresaRif: conces.rif,
        empresaDireccion: conces.direccion,
        empresaTelefono: conces.telefono,
        empresaCorreo: conces.correo,
        numero: 'VISTA PREVIA',
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
        retencionPct: agenteRetencion ? (Number(retencionPct) || 75) : null,
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        color: (typeof color === 'string' && color.trim()) ? color.trim() : undefined,
        cantidad: cantidadNum,
        precioBase,
        modalidad: modalidadFinal,
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
        presupuesto: esPresupuesto ? {
          descuentoPct: presupuestoDescuentoPct, igtf: presupuestoIgtf,
          inicialPct: presupuestoInicialPct, comisionFlat: presupuestoComision,
          financiadoraNombre: presupuestoFinanciadoraNombre,
          cargoGastosAdmin: presupuestoCargoGastosAdmin, cargoPlaca: presupuestoCargoPlaca,
        } : undefined,
      }
      const previewBuf = await renderToBuffer(
        React.createElement(CotizacionPDF, { data: previewData }) as React.ReactElement<any>
      )
      return new NextResponse(Buffer.from(previewBuf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="cotizacion-vista-previa.pdf"',
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    // Vincular cliente por CI/RIF; si no existe, se crea automáticamente para
    // que entre al sistema (antes se quedaba solo en la cotización y nunca
    // aparecía en Clientes). Best-effort: si algo falla acá la cotización
    // igual se guarda, no se pierde la venta.
    const ciNorm = clienteCiRif.trim().toUpperCase()
    let clienteIdVinculado: string | null = null
    try {
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id, vendedor_codigo')
        .ilike('cedula_rif', ciNorm)
        .limit(1)
        .maybeSingle()

      if (clienteExistente) {
        clienteIdVinculado = clienteExistente.id
        // No se pisa si el cliente ya tenía vendedora asignada.
        if (!clienteExistente.vendedor_codigo) {
          await supabase.from('clientes').update({ vendedor_codigo: vendedorasList[0].codigo }).eq('id', clienteExistente.id)
        }
      } else {
        const prefijo = ciNorm.charAt(0)
        const rifJuridico = typeof clienteRif === 'string' && clienteRif.trim() ? clienteRif.trim() : null
        const tipoCliente: 'natural' | 'juridico' = (prefijo === 'J' || prefijo === 'G' || rifJuridico) ? 'juridico' : 'natural'
        const { data: nuevoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            nombre: clienteNombre.trim(),
            cedula_rif: ciNorm,
            tipo: tipoCliente,
            identificacion_juridica: tipoCliente === 'juridico' ? (rifJuridico ?? ciNorm) : null,
            telefono: clienteTelefono?.trim() || null,
            whatsapp: clienteTelefono?.trim() || null,
            correo: correoCliente || null,
            direccion: clienteDireccion?.trim() || null,
            ciudad: clienteCiudadEstado?.trim() || null,
            activo: true,
            observaciones: 'Registrado automáticamente desde una cotización',
            vendedor_codigo: vendedorasList[0].codigo,
          })
          .select('id')
          .single()
        if (errCliente) {
          console.error('[cotizaciones] no se pudo crear el cliente automáticamente:', errCliente)
        } else {
          clienteIdVinculado = nuevoCliente?.id ?? null
        }
      }
    } catch (e) {
      console.error('[cotizaciones] error vinculando/creando cliente:', e)
    }

    // Insertar cotización (trigger auto-genera numero y numero_seq)
    // Estructura de costos por línea (Rojas Personalizada): se guarda con la misma
    // forma que usa "Aplicar descuento", para poder re-editarla y mostrar el
    // desglose en el PDF/proforma. Solo cuando llegan las líneas (cotización Rojas).
    let estructuraCostos: Record<string, unknown> | null = null
    if (estructuraLineas && typeof estructuraLineas === 'object') {
      const CLAVES_EST = ['placa', 'poliza_vehiculo', 'poliza_vida', 'gastos_vhm', 'honorarios', 'gastos_int', 'alfombras', 'transporte', 'accesorios', 'igtf', 'diferencial'] as const
      const lineas: Record<string, number> = {}
      for (const k of CLAVES_EST) lineas[k] = Math.max(0, Number((estructuraLineas as Record<string, unknown>)[k]) || 0)
      estructuraCostos = {
        precioBase, modalidad, plan,
        inicialPct: plan === 'personalizado' ? persIniPct : 0,
        tasaPct: plan === 'personalizado' ? persTasaPct : 0,
        meses: plan === 'personalizado' ? persMeses : 24,
        cuotaVehimotors: 0,
        lineas,
      }
    }

    const { data: cot, error: insertError } = await supabase
      .from('cotizaciones')
      .insert([{
        fecha: hoy.toISOString().slice(0, 10),
        vencimiento: venc.toISOString().slice(0, 10),
        vendedora_nombre: vendedoraNombreFinal,
        vendedoras: vendedorasList,
        concesionario_id: conces.id,
        cliente_id: clienteIdVinculado,
        cliente_nombre: clienteNombre.trim(),
        cliente_ci_rif: clienteCiRif.trim(),
        cliente_correo: correoCliente,
        cliente_telefono: clienteTelefono?.trim() || null,
        cliente_direccion: clienteDireccion?.trim() || null,
        cliente_ciudad_estado: clienteCiudadEstado?.trim() || null,
        cliente_codigo_postal: clienteCodigoPostal?.trim() || null,
        cliente_cedula: (typeof clienteCedula === 'string' && clienteCedula.trim()) ? clienteCedula.trim() : null,
        cliente_rif: (typeof clienteRif === 'string' && clienteRif.trim()) ? clienteRif.trim() : null,
        color: (typeof color === 'string' && color.trim()) ? color.trim() : null,
        agente_retencion: !!agenteRetencion,
        retencion_pct: agenteRetencion ? (Number(retencionPct) || 75) : null,
        vehiculo_id: vehiculoIdGuardar,
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        cantidad: cantidadNum,
        precio_base: precioBase,
        modalidad: modalidadFinal,
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
        descuento_pct: esPresupuesto ? presupuestoDescuentoPct : null,
        igtf_monto: esPresupuesto ? presupuestoIgtf : null,
        financiadora_id: esPresupuesto && presupuestoInicialPct < 100 ? financiadoraId : null,
        comision_flat_monto: esPresupuesto ? presupuestoComision : null,
        inicial_pct: esPresupuesto ? presupuestoInicialPct : null,
        cargo_gastos_admin: esPresupuesto ? presupuestoCargoGastosAdmin : false,
        cargo_placa: esPresupuesto ? presupuestoCargoPlaca : false,
        ac500_meses: plan === 'ac500' ? ac500Meses : null,
        ac500_cuotas: plan === 'ac500' && ac500Schedule ? ac500Schedule.cuotas.map(c => c.monto) : null,
        cuotas_banco: plan === 'banco_100' ? mesesBanco : null,
        personalizado_inicial_pct: plan === 'personalizado' ? persIniPct : null,
        personalizado_meses: plan === 'personalizado' ? persMeses : null,
        personalizado_tasa_pct: plan === 'personalizado' ? persTasaPct : null,
        personalizado_diferencial: plan === 'personalizado' ? persDiferencial : false,
        condiciones_personalizadas: condPersonalizadas,
        bn_vehimotors: bnVehimotorsData,
        banco: bancoCot,
        estructura_costos: estructuraCostos,
      }])
      .select()
      .single()

    if (insertError || !cot) {
      console.error('[cotizaciones] insert error:', insertError)
      return NextResponse.json({ error: 'Error al guardar la cotización' }, { status: 500 })
    }

    const pdfData: CotizacionPDFData = {
      logoSrc: conces.logoSrc,
      selloSrc: conces.selloSrc,
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
      retencionPct: agenteRetencion ? (Number(retencionPct) || 75) : null,
      marca: vehiculo.brand,
      modelo: vehiculo.model,
      color: (typeof color === 'string' && color.trim()) ? color.trim() : undefined,
      cantidad: cantidadNum,
      precioBase,
      modalidad: modalidadFinal,
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
      presupuesto: esPresupuesto ? {
        descuentoPct: presupuestoDescuentoPct, igtf: presupuestoIgtf,
        inicialPct: presupuestoInicialPct, comisionFlat: presupuestoComision,
        financiadoraNombre: presupuestoFinanciadoraNombre,
        cargoGastosAdmin: presupuestoCargoGastosAdmin, cargoPlaca: presupuestoCargoPlaca,
      } : undefined,
    }

    // Enviar emails (ambos en paralelo, errores no bloqueantes).
    // El correo al cliente solo se envía si dejó su correo (ahora es opcional).
    const emailResults = await Promise.allSettled([
      (correoCliente && debeEnviarCliente) ? enviarCotizacionCliente(pdfData, cot.token_respuesta, cot.id) : Promise.resolve(null),
      enviarNotificacionRojas({
        numero: cot.numero,
        vendedoraNombre: vendedora.nombre,
        clienteNombre: clienteNombre.trim(),
        clienteCorreo: correoCliente,
        clienteCiRif: clienteCiRif.trim(),
        marca: vehiculo.brand,
        modelo: vehiculo.model,
        modalidad: modalidadFinal,
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

    return NextResponse.json({ ok: true, numero: cot.numero, id: cot.id, enviado: !!(correoCliente && debeEnviarCliente) }, { status: 201 })
  } catch (err) {
    console.error('[cotizaciones] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const COT_COLS = 'id, numero, fecha, vencimiento, vendedora_nombre, concesionario_id, cliente_nombre, cliente_ci_rif, cliente_correo, cliente_telefono, cliente_direccion, cliente_ciudad_estado, cliente_codigo_postal, agente_retencion, retencion_pct, marca, modelo, modalidad, plan, precio_base, iva_monto, gastos_monto, financiamiento_monto, cuota_mensual, total_inicial, costo_total, estado, motivo_rechazo, descuento_solicitado, motivo_descuento, condiciones_personalizadas, created_at, resend_email_id, email_ultimo_estado, email_ultimo_evento_at'

// Tope de tiempo por base externa para no colgar el panel si una sede tarda.
function conTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

// `full=true` (bases externas) usa select('*') para ser resistente a que una
// sede tenga un esquema ligeramente distinto (p. ej. le falte una columna);
// se limpian los campos sensibles (token de respuesta) antes de devolver.
async function traerCotizaciones(db: SupabaseClient, limit: number, full = false): Promise<any[]> {
  const { data, error } = await db.from('cotizaciones').select(full ? '*' : COT_COLS)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  let rows = (data ?? []) as any[]
  if (full) rows = rows.map(({ token_respuesta, ...r }: any) => r)
  return rows
}

type FuenteResultado = { ok: boolean; rows: any[]; error: string | null }
const okRows = (rows: any[]): FuenteResultado => ({ ok: true, rows, error: null })
const errRows = (e: unknown): FuenteResultado => ({ ok: false, rows: [], error: String((e as any)?.message ?? e) })

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user: authUser } } = await authClient.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const debug = searchParams.get('debug') === '1'
  const supabase = await createAdminClient()

  // Panel central: agrega las cotizaciones de la base local + las de las otras
  // sedes del grupo (cada una con su propia BD). Las externas son best-effort:
  // si una falla o no está configurada, se ignora sin romper el panel.
  const externos = sedesExternas()
  const local = await conTimeout(
    traerCotizaciones(supabase, limit).then(okRows).catch(errRows), 4500, errRows('timeout'))
  const extResultados = await Promise.all(externos.map(async a => {
    const cli = createServiceClient(a.url, a.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const r = await conTimeout(traerCotizaciones(cli, limit, true).then(okRows).catch(errRows), 4000, errRows('timeout'))
    let host = a.url
    try { host = new URL(a.url).host } catch { /* url mal formada */ }
    return { key: a.key, label: a.label, host, ...r }
  }))

  // Diagnóstico (?debug=1): no expone secretos, solo host + conteos + error.
  if (debug) {
    return NextResponse.json({
      local: { ok: local.ok, count: local.rows.length, error: local.error },
      externosConfigurados: externos.length,
      externos: extResultados.map(e => ({ key: e.key, label: e.label, host: e.host, ok: e.ok, count: e.rows.length, error: e.error })),
    })
  }

  const todas = [local.rows, ...extResultados.map(e => e.rows)].flat()

  // Dedup por id (uuid único por base) y orden por fecha desc.
  const map = new Map<string, any>()
  for (const c of todas) {
    const key = String(c?.id ?? '')
    if (!key || map.has(key)) continue
    map.set(key, c)
  }
  const merged = Array.from(map.values())
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .slice(0, limit)

  return NextResponse.json(merged)
}
