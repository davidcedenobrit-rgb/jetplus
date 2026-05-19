'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Trash2, Loader2, ExternalLink } from 'lucide-react'

const TIPOS_DOCUMENTO = [
  { value: 'cedula', label: 'Cédula de identidad' },
  { value: 'rif', label: 'RIF' },
  { value: 'proforma', label: 'Proforma' },
  { value: 'fe_entrega', label: 'Fe de entrega' },
  { value: 'poliza', label: 'Póliza de seguro' },
  { value: 'factura', label: 'Factura' },
  { value: 'certificado_origen', label: 'Certificado de origen' },
  { value: 'registro_mercantil', label: 'Registro mercantil' },
  { value: 'otro', label: 'Otro documento' },
]

interface Documento {
  id: string
  url: string
  nombre: string | null
  tipo_documento: string | null
  created_at: string
}

export default function DocumentosCliente({
  clienteId,
  documentosIniciales,
}: {
  clienteId: string
  documentosIniciales: Documento[]
}) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciales)
  const [tipoSel, setTipoSel] = useState('cedula')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setUploading(false); return }

    const nuevos: Documento[] = []
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) { setError('Máximo 20 MB por archivo'); continue }
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `documentos/clientes/${clienteId}/${tipoSel}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { contentType: file.type })
      if (upErr) { setError(`Error subiendo ${file.name}`); continue }
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      const { data: inserted } = await supabase.from('archivos').insert({
        tipo: 'documento_cliente',
        tipo_documento: tipoSel,
        url: urlData.publicUrl,
        nombre: file.name,
        cliente_id: clienteId,
        subido_por: user.id,
      }).select().single()
      if (inserted) nuevos.push(inserted as Documento)
    }

    setDocumentos(prev => [...nuevos, ...prev])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function eliminar(docId: string) {
    await supabase.from('archivos').delete().eq('id', docId)
    setDocumentos(prev => prev.filter(d => d.id !== docId))
  }

  const porTipo = TIPOS_DOCUMENTO.map(t => ({
    ...t,
    docs: documentos.filter(d => d.tipo_documento === t.value),
  })).filter(t => t.docs.length > 0)

  const labelTipo = (val: string) => TIPOS_DOCUMENTO.find(t => t.value === val)?.label ?? val

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="label">Tipo de documento</label>
          <select className="select" value={tipoSel} onChange={e => setTipoSel(e.target.value)}>
            {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleUpload} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-oriental-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Subiendo...' : 'Subir archivo'}
        </button>
      </div>

      {error && <p className="text-xs text-oriental-red">{error}</p>}

      {/* Lista por tipo */}
      {porTipo.length > 0 ? (
        <div className="space-y-4">
          {porTipo.map(grupo => (
            <div key={grupo.value}>
              <p className="text-xs font-semibold text-oriental-gray uppercase tracking-wider mb-2">{grupo.label}</p>
              <div className="space-y-2">
                {grupo.docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white transition-colors">
                    <FileText size={16} className="text-oriental-gray flex-shrink-0" />
                    <p className="flex-1 text-sm text-oriental-black truncate">{doc.nombre ?? labelTipo(doc.tipo_documento ?? '')}</p>
                    <p className="text-[11px] text-oriental-gray flex-shrink-0">{new Date(doc.created_at).toLocaleDateString('es-VE')}</p>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-oriental-gray hover:text-oriental-red transition-colors">
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => eliminar(doc.id)} className="text-oriental-gray hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-oriental-gray">Sin documentos. Sube el primero arriba.</p>
        </div>
      )}
    </div>
  )
}
