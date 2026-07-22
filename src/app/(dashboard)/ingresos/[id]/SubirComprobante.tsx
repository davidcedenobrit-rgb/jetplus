'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/FileUpload'

// Subir comprobantes a un ingreso ya registrado (se guardan en la tabla archivos).
export default function SubirComprobante({ ingresoId, tieneComprobantes }: { ingresoId: string; tieneComprobantes: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function onFilesChange(files: { url: string; nombre: string }[]) {
    if (files.length === 0) return
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const rows = files.map(f => ({
      tipo: 'comprobante', url: f.url, nombre: f.nombre,
      ingreso_id: ingresoId, subido_por: user?.id ?? null,
    }))
    const { error: insErr } = await supabase.from('archivos').insert(rows)
    setSaving(false)
    if (insErr) { setError('No se pudo guardar el comprobante'); return }
    router.refresh()
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-oriental-black mb-3">
        {tieneComprobantes ? 'Agregar comprobante' : 'Subir comprobante'}
      </h3>
      <FileUpload files={[]} onFilesChange={onFilesChange} maxFiles={10} disabled={saving} />
      {saving && <p className="text-xs text-gray-500 mt-2">Guardando comprobante…</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
