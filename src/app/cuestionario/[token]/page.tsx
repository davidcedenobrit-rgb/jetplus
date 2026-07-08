import { createAdminClient } from '@/lib/supabase/server'
import CuestionarioForm from './CuestionarioForm'

export const dynamic = 'force-dynamic'

export default async function CuestionarioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = await createAdminClient()

  const { data: empleado } = await admin
    .from('empleados')
    .select('id, nombre, cedula, telefono, correo, correo_empresa, fecha_ingreso, cargo, departamento, reporta_a, estado, vence_at')
    .eq('token', token)
    .maybeSingle()

  if (!empleado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Enlace no válido</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Este enlace no existe o ha sido revocado. Contacte a La Oriental.</p>
        </div>
      </div>
    )
  }

  if (empleado.estado === 'completado') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif', maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>¡Cuestionario recibido!</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
            Gracias, {empleado.nombre.split(' ')[0]}. Su descripción de cargo ya fue enviada a La Oriental. No necesita hacer nada más.
          </p>
        </div>
      </div>
    )
  }

  const vencido = empleado.vence_at ? new Date(empleado.vence_at) < new Date() : false

  return (
    <CuestionarioForm
      token={token}
      vencido={vencido}
      venceAt={empleado.vence_at}
      inicial={{
        nombre: empleado.nombre ?? '',
        cedula: empleado.cedula ?? '',
        telefono: empleado.telefono ?? '',
        correo: empleado.correo ?? '',
        correoEmpresa: empleado.correo_empresa ?? '',
        fechaIngreso: empleado.fecha_ingreso ?? '',
        cargo: empleado.cargo ?? '',
        departamento: empleado.departamento ?? '',
        reportaA: empleado.reporta_a ?? '',
      }}
    />
  )
}
