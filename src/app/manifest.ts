import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LO Centro de Mando',
    short_name: 'LO CDM',
    description: 'Control financiero — La Oriental Automotors MG & MAXUS',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#D31F2A',
    categories: ['finance', 'business'],
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
