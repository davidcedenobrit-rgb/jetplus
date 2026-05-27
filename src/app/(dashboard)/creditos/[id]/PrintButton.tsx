'use client'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-oriental-gray text-sm font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
      title="Imprimir estado de cuenta"
    >
      <Printer size={15} />
      Imprimir
    </button>
  )
}
