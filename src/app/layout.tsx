import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'La Oriental Finanzas',
  description: 'Control de ingresos, egresos y recibos — La Oriental Automotors',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
