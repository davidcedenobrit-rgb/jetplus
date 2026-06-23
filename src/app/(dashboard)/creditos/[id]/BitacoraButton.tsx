'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import BitacoraCobro from '@/app/(dashboard)/reportes/BitacoraCobro'

interface Props {
  clienteId: string
  nombre: string
}

export default function BitacoraButton({ clienteId, nombre }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-oriental-gray text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        title="Bitácora de cobro"
      >
        <Search size={15} />
        Bitácora
      </button>
      {open && (
        <BitacoraCobro
          clienteId={clienteId}
          nombre={nombre}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
