import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrecompraHub from './PrecompraHub'

const ROLES = ['jose', 'admin', 'director', 'mary', 'leysdem']

export default async function PrecompraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const rol = (user.app_metadata?.rol as string) ?? ''
  if (!ROLES.includes(rol)) redirect('/dashboard')

  const [catalogo, showroomRaw, cfgTasas] = await Promise.all([
    supabase.from('catalogo_ventas').select('*').order('orden'),
    supabase.from('vehiculos_showroom').select('marca, modelo').eq('estado', 'en_agencia'),
    supabase.from('config_cotizaciones').select('clave, valor').in('clave', ['tasa_bcv', 'tasa_usdt']),
  ])
  const tasas = {
    bcv: Number(cfgTasas.data?.find((c: { clave: string; valor: unknown }) => c.clave === 'tasa_bcv')?.valor) || 0,
    usdt: Number(cfgTasas.data?.find((c: { clave: string; valor: unknown }) => c.clave === 'tasa_usdt')?.valor) || 0,
  }
  const showroomMap: Record<string, number> = {}
  for (const r of showroomRaw.data ?? []) {
    const k = `${r.marca}||${r.modelo}`
    showroomMap[k] = (showroomMap[k] ?? 0) + 1
  }
  const showroomStock = Object.entries(showroomMap).map(([k, unidades]) => {
    const [marca, modelo] = k.split('||')
    return { marca, modelo, unidades }
  })

  const esRojas = rol === 'jose'

  return (
    <PrecompraHub
      catalogo={catalogo.data ?? []}
      showroomStock={showroomStock}
      tasas={tasas}
      esRojas={esRojas}
    />
  )
}
