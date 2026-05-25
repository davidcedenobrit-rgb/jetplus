import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#D31F2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'LO CDM',
  description: 'Control financiero — La Oriental Automotors MG & MAXUS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LO CDM',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* iOS — instalar como app */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LO CDM" />
        {/* iOS splash / icon */}
        <link rel="apple-touch-icon" href="/apple-icon" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon" />
      </head>
      <body>{children}</body>
    </html>
  )
}
