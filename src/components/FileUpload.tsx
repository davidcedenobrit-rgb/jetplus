'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, X, Upload, ImageIcon, Loader2 } from 'lucide-react'

interface UploadedFile {
  id?: string
  url: string
  nombre: string
}

interface FileUploadProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  disabled?: boolean
}

export default function FileUpload({ files, onFilesChange, maxFiles = 5, disabled }: FileUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    const remaining = maxFiles - files.length
    if (remaining <= 0) {
      setError(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    const toUpload = Array.from(selected).slice(0, remaining)
    setUploading(true)
    setError('')

    const newFiles: UploadedFile[] = []

    for (const file of toUpload) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Solo se permiten imágenes y PDFs')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no puede superar 10 MB')
        continue
      }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, file, { contentType: file.type })

      if (uploadError) {
        setError(`Error subiendo ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(path)

      newFiles.push({ url: urlData.publicUrl, nombre: file.name })
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles])
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {file.url.match(/\.(pdf)$/i) ? (
                <div className="w-full h-28 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <ImageIcon size={24} className="mx-auto text-oriental-gray" />
                    <p className="text-[10px] text-oriental-gray mt-1 px-2 truncate max-w-[120px]">{file.nombre}</p>
                  </div>
                </div>
              ) : (
                <img
                  src={file.url}
                  alt={file.nombre}
                  className="w-full h-28 object-cover"
                />
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
              <p className="text-[10px] text-oriental-gray px-2 py-1.5 truncate">{file.nombre}</p>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-oriental-red hover:bg-oriental-red/5 text-oriental-gray hover:text-oriental-red transition-all disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">Subiendo...</span>
            </>
          ) : (
            <>
              <Camera size={18} />
              <span className="text-sm font-medium">
                {files.length === 0 ? 'Adjuntar comprobante (foto o PDF)' : 'Agregar otro comprobante'}
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-oriental-red">{error}</p>
      )}

      <p className="text-[11px] text-oriental-gray">
        Fotos de depósitos, capturas de pago móvil, comprobantes USDT, etc. Máx. {maxFiles} archivos, 10 MB c/u.
      </p>
    </div>
  )
}
