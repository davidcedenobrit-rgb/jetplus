import VentasStyles from '@/components/ventas/VentasStyles'

export const metadata = {
  title: 'Aliados — JETPLUS',
  description: 'Panel de aliados JETPLUS: cotiza el Plan Asegúrate $500 y envía clientes referidos al concesionario.',
  robots: { index: false, follow: false },
}

export default function AliadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VentasStyles />
      {children}
    </>
  )
}
