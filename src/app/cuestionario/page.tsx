import CuestionarioForm from './[token]/CuestionarioForm'

export const dynamic = 'force-dynamic'

// Enlace BASE público (sin token) para compartir en el grupo de WhatsApp.
// Cualquier trabajador lo llena y queda registrado automáticamente en la nómina.
export default function CuestionarioPublicoPage() {
  return <CuestionarioForm modo="publico" />
}
