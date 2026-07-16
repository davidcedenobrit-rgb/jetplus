import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BRANDING } from '@/lib/branding'

export const viewport: Viewport = {
  themeColor: '#D31F2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: `Centro de Mando · ${BRANDING.nombre}`,
  description: 'Control financiero',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: `${BRANDING.iniciales} Centro de Mando`,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
