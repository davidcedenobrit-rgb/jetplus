import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import { redirect } from 'next/navigation'
import ConciliacionVMClient, { type FilaVM } from './ConciliacionVMClient'

export const dynamic = 'force-dynamic'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

function esDirectoVM(metodo: string | null, canal: string | null) {
  const m = (metodo ?? '').toLowerCase()
  const c = (canal ?? '').toLowerCase()
  return m.includes('vehimotor') || m === 'usdt ve' || c === 'cta_vehimotors'
}

export default async function ConciliacionVehimotorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const ingresos = await fetchAllRows<any>((from, to) => svc
    .from('ingresos')
    .select('id, numero_recibo, monto, moneda, fecha_pago, metodo_pago, canal_destino, placa, estado, clientes(nombre)')
    .neq('estado', 'anulado')
    .order('fecha_pago', { ascending: false })
    .range(from, to))

  const reportes = await fetchAllRows<any>((from, to) => svc
    .from('reportes_vehimotors')
    .select('ingreso_id, estado, monto_reportado, moneda')
    .range(from, to))

  // Mejor estado de reporte por ingreso: confirmado > enviado > rechazado
  const prioridad: Record<string, number> = { confirmado: 3, enviado: 2, rechazado: 1 }
  const reportePorIngreso: Record<string, { estado: string; monto: number }> = {}
  for (const r of reportes) {
    if (!r.ingreso_id) continue
    const prev = reportePorIngreso[r.ingreso_id]
    const p = prioridad[r.estado] ?? 0
    if (!prev || p > (prioridad[prev.estado] ?? 0)) {
      reportePorIngreso[r.ingreso_id] = { estado: r.estado, monto: Number(r.monto_reportado) || 0 }
    }
  }

  const filas: FilaVM[] = ingresos
    .filter(i => esDirectoVM(i.metodo_pago, i.canal_destino))
    .map(i => {
      const rep = reportePorIngreso[i.id]
      const estadoReporte = rep ? rep.estado : 'sin_reportar'
      return {
        id: i.id,
        numero: i.numero_recibo ?? null,
        cliente: (i.clientes?.nombre as string) ?? null,
        placa: i.placa ?? null,
        monto: Number(i.monto) || 0,
        moneda: i.moneda ?? 'USD',
        fecha: i.fecha_pago ?? null,
        metodo: i.metodo_pago ?? null,
        estadoReporte,
      }
    })

  return <ConciliacionVMClient filas={filas} />
}
