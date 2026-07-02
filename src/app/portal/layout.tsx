import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal del Cliente · La Oriental Automotors',
  description: 'Su vehículo, cuotas y servicios en un solo lugar',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 antialiased">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-sm relative pb-24">
        {children}
      </div>
    </div>
  )
}
