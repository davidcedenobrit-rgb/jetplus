import { createAdminClient } from '@/lib/supabase/server'
import RespuestaForm from './RespuestaForm'

export default async function ResponderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ r?: string }>
}) {
  const { token } = await params
  const { r } = await searchParams
  const supabase = await createAdminClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('numero, marca, modelo, total_inicial, cliente_nombre, estado, descuento_solicitado')
    .eq('token_respuesta', token)
    .single()

  const accionInicial =
    r === 'aceptar'    ? 'aceptada' as const :
    r === 'posponer'   ? 'pospuesta' as const :
    r === 'rechazar'   ? 'rechazar_motivo' as const :
    r === 'descuento'  ? 'descuento_form' as const :
    undefined

  // Allow showing form if: sin_respuesta OR has pending discount request (cotización was re-sent)
  const puedeResponder = cot && (cot.estado === 'sin_respuesta' || cot.descuento_solicitado)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 8px 40px rgba(0,0,0,.08)', width: '100%', maxWidth: 520, margin: '0 16px', overflow: 'hidden' }}>

        {!cot ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Enlace no válido</h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Este enlace de cotización no existe o ya expiró.</p>
          </div>
        ) : !puedeResponder ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {cot.estado === 'aceptada' ? '✅' : cot.estado === 'pospuesta' ? '⏸' : '❌'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Ya respondiste esta cotización</h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              Tu respuesta fue <strong>"{cot.estado === 'aceptada' ? 'Aceptada' : cot.estado === 'pospuesta' ? 'Por ahora no compraré' : 'No me interesa'}"</strong>. Si necesitas cambiarla, contacta a tu asesor.
            </p>
          </div>
        ) : (
          <RespuestaForm
            token={token}
            numero={cot.numero}
            marca={cot.marca}
            modelo={cot.modelo}
            totalInicial={Number(cot.total_inicial)}
            clienteNombre={cot.cliente_nombre}
            accionInicial={accionInicial}
          />
        )}

      </div>
    </div>
  )
}
