import VentasStyles from '@/components/ventas/VentasStyles'

export const metadata = {
  title: 'Vehículos MG & MAXUS — JETPLUS',
  description: 'Explora precios base, planes de financiamiento 40% y el plan Asegúrate con $500 para vehículos MG y MAXUS en Porlamar, Nueva Esparta.',
}

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VentasStyles />
      {children}
    </>
  )
}
