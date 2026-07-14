import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PagosFijosClient from './PagosFijosClient'

export const dynamic = 'force-dynamic'

export default function PagosFijosPage() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/egresos" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} className="text-oriental-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Control de Pago Fijo</h1>
          <p className="text-oriental-gray text-sm mt-0.5">Gastos recurrentes (alquiler, nómina, servicios). El sistema recuerda el próximo pago y genera el egreso.</p>
        </div>
      </div>
      <PagosFijosClient />
    </div>
  )
}
