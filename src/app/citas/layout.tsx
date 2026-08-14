import VentasStyles from '@/components/ventas/VentasStyles'

export const metadata = {
  title: 'Agenda tu cita — Taller JETPLUS',
  description: 'Agenda tu cita de servicio para tu MG o MAXUS. Lunes a viernes, 7:00 a.m. a 5:00 p.m.',
}

export default function CitasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VentasStyles />
      {children}
    </>
  )
}
