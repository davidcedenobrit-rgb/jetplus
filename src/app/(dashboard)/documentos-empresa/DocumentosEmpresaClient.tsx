'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Trash2, Loader2, ExternalLink } from 'lucide-react'

const TIPOS_DOCUMENTO = [
  { value: 'rif_empresa', label: 'RIF de la empresa' },
  { value: 'acta_constitutiva', label: 'Acta constitutiva' },
  { value: 'registro_mercantil', label: 'Registro mercantil' },
  { value: 'patente', label: 'Patente / Licencia de actividad' },
  { value: 'contrato_concesion', label: 'Contrato de concesión' },
  { value: 'estado_cuenta', label: 'Estado de cuenta bancario' },
  { value: 'poliza_seguro', label: 'Póliza de seguro empresarial' },
  { value: 'declaracion_ivss', label: 'Declaración IVSS' },
  { value: 'declaracion_islr', label: 'Declaración ISLR' },
  { value: 'otro', label: 'Otro documento' },
]

interface Documento {
  id: string
  url: string
  nombre: string | null
  tipo_documento: string | null
  created_at: string
}

export default function DocumentosEmpresaClient({ documentosIniciales }: { documentosIniciales: Documento[] }) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciales)
  const [tipoSel, setTipoSel] = useState('rif_empresa')
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
      const path = `documentos/empresa/${tipoSel}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { contentType: file.type })
      if (upErr) { setError(`Error subiendo ${file.name}`); continue }
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
      const { data: inserted } = await supabase.from('archivos').insert({
        tipo: 'documento_empresa',
        tipo_documento: tipoSel,
        url: urlData.publicUrl,
        nombre: file.name,
        es_empresa: true,
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

  const labelTipo = (val: string) => TIPOS_DOCUMENTO.find(t => t.value === val)?.label ?? val

  const porTipo = TIPOS_DOCUMENTO.map(t => ({
    ...t,
    docs: documentos.filter(d => d.tipo_documento === t.value),
  })).filter(t => t.docs.length > 0)

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-oriental-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-oriental-red rounded-full" />
          Subir nuevo documento
        </h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-60">
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
            className="flex items-center gap-2 px-5 py-2.5 bg-oriental-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </button>
        </div>
        {error && <p className="text-xs text-oriental-red mt-2">{error}</p>}
      </div>

      {/* Documentos por categoría */}
      {porTipo.length > 0 ? (
        <div className="space-y-6">
          {porTipo.map(grupo => (
            <div key={grupo.value} className="card p-6">
              <h3 className="font-bold text-oriental-black mb-4 text-sm flex items-center gap-2">
                <FileText size={16} className="text-oriental-gray" />
                {grupo.label}
                <span className="ml-auto text-xs text-oriental-gray font-normal">{grupo.docs.length} archivo{grupo.docs.length > 1 ? 's' : ''}</span>
              </h3>
              <div className="space-y-2">
                {grupo.docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50 transition-colors">
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
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-oriental-gray text-sm font-medium">Sin documentos de empresa aún</p>
          <p className="text-oriental-gray text-xs mt-1">Sube el primer documento usando el panel de arriba</p>
        </div>
      )}
    </div>
  )
}
