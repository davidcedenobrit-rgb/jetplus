import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import MovimientosClient, { type Movimiento } from './MovimientosClient'
import type { Cuenta } from './actions'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

// Deriva la cuenta a la que cae el movimiento a partir de sus propios datos
// (método, banco receptor/origen, canal). Lo que va directo a Vehimotors se
// marca aparte y no cuenta para los saldos de Jetplus.
function derivarCuenta(m: { tipo: string; metodo: string | null; banco: string | null; moneda: string; canal?: string | null }): { label: string; esVehimotors: boolean } {
  const metodo = (m.metodo ?? '').toLowerCase()
  const banco = (m.banco ?? '').trim()
  const canal = (m.canal ?? '').toLowerCase()
  // Pagos directos a Vehimotors (solo aplica a ingresos: el cliente pagó a la cuenta de VM)
  if (m.tipo === 'ingreso' && (metodo.includes('vehimotor') || metodo === 'usdt ve' || canal === 'cta_vehimotors')) {
    return { label: 'Vehimotors CCS', esVehimotors: true }
  }
  if (metodo === 'usdt ch') return { label: 'USDT CH', esVehimotors: false }
  if (metodo === 'usdt jr') return { label: 'USDT JR', esVehimotors: false }
  if (metodo.includes('binance') || banco.toLowerCase() === 'binance usdt') return { label: 'Binance USDT', esVehimotors: false }
  if (metodo.includes('efectivo')) return { label: m.moneda === 'VES' ? 'Efectivo Bs.' : 'Efectivo USD', esVehimotors: false }
  if (banco && banco.toLowerCase() !== 'otro') return { label: banco, esVehimotors: false }
  return { label: 'Sin clasificar', esVehimotors: false }
}

export default async function MovimientosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  // Vista financiera completa: se lee con service-role tras la guarda de rol.
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: cuentasData } = await svc
    .from('cuentas').select('id, nombre, tipo, moneda, custodio, banco, orden, activo')
    .eq('activo', true).order('orden').order('nombre')
  const cuentas = (cuentasData ?? []) as Cuenta[]
  const cuentaById = Object.fromEntries(cuentas.map(c => [c.id, c]))

  const ingresos = await fetchAllRows<any>((from, to) => svc
    .from('ingresos')
    .select('id, numero_recibo, concepto, monto, moneda, metodo_pago, fecha_pago, banco_receptor, deposito_banco, canal_destino, estado, cuenta_id, conciliado, conciliado_por, conciliado_at, clientes(nombre)')
    .neq('estado', 'anulado')
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const egresos = await fetchAllRows<any>((from, to) => svc
    .from('egresos')
    .select('id, numero_egreso, concepto, monto, moneda, metodo_pago, fecha_egreso, banco_origen, beneficiario, estado, cuenta_id, conciliado, conciliado_por, conciliado_at')
    .neq('estado', 'anulado')
    .order('fecha_egreso', { ascending: false })
    .range(from, to))

  const movs: Movimiento[] = []

  for (const i of ingresos) {
    const banco = i.banco_receptor || i.deposito_banco || null
    const der = derivarCuenta({ tipo: 'ingreso', metodo: i.metodo_pago, banco, moneda: i.moneda ?? 'USD', canal: i.canal_destino })
    const explicita = i.cuenta_id ? cuentaById[i.cuenta_id] : null
    movs.push({
      tipo: 'ingreso', id: i.id,
      numero: i.numero_recibo ?? null,
      fecha: i.fecha_pago ?? null,
      concepto: i.concepto ?? null,
      contraparte: (i.clientes?.nombre as string) ?? null,
      metodo: i.metodo_pago ?? null,
      moneda: i.moneda ?? 'USD',
      monto: Number(i.monto) || 0,
      banco,
      estado: i.estado ?? null,
      cuenta_id: i.cuenta_id ?? null,
      cuentaLabel: explicita ? explicita.nombre : der.label,
      esVehimotors: explicita ? false : der.esVehimotors,
      conciliado: !!i.conciliado,
      conciliado_por: i.conciliado_por ?? null,
      conciliado_at: i.conciliado_at ?? null,
    })
  }

  for (const e of egresos) {
    const banco = e.banco_origen || null
    const der = derivarCuenta({ tipo: 'egreso', metodo: e.metodo_pago, banco, moneda: e.moneda ?? 'USD' })
    const explicita = e.cuenta_id ? cuentaById[e.cuenta_id] : null
    movs.push({
      tipo: 'egreso', id: e.id,
      numero: e.numero_egreso ?? null,
      fecha: e.fecha_egreso ?? null,
      concepto: e.concepto ?? null,
      contraparte: e.beneficiario ?? null,
      metodo: e.metodo_pago ?? null,
      moneda: e.moneda ?? 'USD',
      monto: Number(e.monto) || 0,
      banco,
      estado: e.estado ?? null,
      cuenta_id: e.cuenta_id ?? null,
      cuentaLabel: explicita ? explicita.nombre : der.label,
      esVehimotors: false,
      conciliado: !!e.conciliado,
      conciliado_por: e.conciliado_por ?? null,
      conciliado_at: e.conciliado_at ?? null,
    })
  }

  movs.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))

  return <MovimientosClient movimientos={movs} cuentas={cuentas} />
}
