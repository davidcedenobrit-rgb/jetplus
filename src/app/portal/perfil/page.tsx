import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { User, Mail, Phone, MapPin, Hash } from 'lucide-react'
import BottomNav from '../BottomNav'
import PortalHeader from '../PortalHeader'
import CerrarSesionCliente from './CerrarSesionCliente'

export default async function PerfilPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.rol !== 'cliente') redirect('/portal/login')

  const admin = await createAdminClient()
  const { data: cuenta } = await admin
    .from('cliente_cuentas')
    .select('cliente_id, ultimo_acceso_at, clientes(*)')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) redirect('/portal/login')
  const cliente: any = (cuenta as any).clientes

  return (
    <div>
      <PortalHeader />
      <div className="px-5 py-4">
        <p className="text-[10px] font-black text-oriental-gray uppercase tracking-widest">Mi perfil</p>
        <h1 className="text-xl font-black text-oriental-black mt-0.5">{cliente?.nombre ?? 'Cliente'}</h1>
        <p className="text-xs text-oriental-gray mt-0.5 font-mono">{cliente?.cedula_rif}</p>
      </div>

      <div className="mx-5 space-y-2">
        <Row icon={Mail} label="Correo" value={user.email ?? '—'} />
        <Row icon={Phone} label="Teléfono" value={cliente?.telefono ?? '—'} />
        <Row icon={Phone} label="WhatsApp" value={cliente?.whatsapp ?? '—'} />
        <Row icon={MapPin} label="Ciudad" value={cliente?.ciudad ?? '—'} />
        <Row icon={Hash} label="C.I. / RIF" value={cliente?.cedula_rif ?? '—'} mono />
      </div>

      <div className="mx-5 mt-6 bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-[11px] text-oriental-gray mb-3">
          Si algún dato no es correcto, contacte a su asesor para actualizarlo.
        </p>
        <a
          href="https://wa.me/584149989010"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700"
        >
          Contactar por WhatsApp
        </a>
      </div>

      <div className="mx-5 mt-4">
        <CerrarSesionCliente />
      </div>

      <BottomNav />
    </div>
  )
}

function Row({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
      <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-oriental-red" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-oriental-gray uppercase font-bold tracking-wide">{label}</p>
        <p className={`text-sm font-semibold text-oriental-black truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
