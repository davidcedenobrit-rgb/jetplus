import VentasStyles from '@/components/ventas/VentasStyles'

export const metadata = {
  title: 'Vehículos MG & MAXUS — JETPLUS',
  description: 'Explora vehículos MG y MAXUS y el Plan Asegúrate $500. Escríbenos directo por WhatsApp.',
}

export default function RedesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VentasStyles />
      {children}
    </>
  )
}
