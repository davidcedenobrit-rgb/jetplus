'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Upload, ExternalLink, Loader2,
  Receipt, Award, ShieldCheck, HeartPulse,
  FileSignature, CreditCard, ClipboardList, Trash2
} from 'lucide-react'

const CATEGORIAS = [
  {
    tipo: 'factura',
    label: 'Factura',
    icon: Receipt,
    color: 'bg-blue-50 border-blue-100',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    tipo: 'certificado_origen',
    label: 'Certificado de Origen',
    icon: Award,
    color: 'bg-emerald-50 border-emerald-100',
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    tipo: 'poliza_vehiculo',
    label: 'Póliza Vehículo',
    icon: ShieldCheck,
    color: 'bg-purple-50 border-purple-100',
    iconColor: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    tipo: 'poliza_vida',
    label: 'Póliza Vida',
    icon: HeartPulse,
    color: 'bg-rose-50 border-rose-100',
    iconColor: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700',
  },
  {
    tipo: 'contrato',
    label: 'Contrato',
    icon: FileSignature,
    color: 'bg-amber-50 border-amber-100',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    tipo: 'giros',
    label: 'Giros',
    icon: CreditCard,
    color: 'bg-indigo-50 border-indigo-100',
    iconColor: 'text-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  {
    tipo: 'proforma',
    label: 'Proforma',
    icon: ClipboardList,
    color: 'bg-teal-50 border-teal-100',
    iconColor: 'text-teal-500',
    badge: 'bg-teal-100 text-teal-700',
  },
] as const

type Archivo = {
  id: string
  tipo: string
  url: string
  nombre: string | null
  created_at: string
}

interface Props {
  vehiculoId: string
  archivosIniciales: Archivo[]
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function NombreArchivo(url: string, nombre: string | null) {
  if (nombre) return nombre
  try {
    return decodeURIComponent(url.split('/').pop() ?? 'Documento')
  } catch {
    return 'Documento'
  }
}

export default function VehiculoDocumentos({ vehiculoId, archivosIniciales }: Props) {
  const supabase = createClient()
  const [archivos, setArchivos] = useState<Archivo[]>(archivosIniciales)
  const [uploading, setUploading] = useState<string | null>(null)   // tipo en curso
  const [deleting, setDeleting]   = useState<string | null>(null)   // id en curso
  const [error, setError]         = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleUpload(tipo: string, file: File) {
    setError(null)
    setUploading(tipo)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setUploading(null); return }

    const ext  = file.name.split('.').pop() ?? 'bin'
    const path = `vehiculos/${vehiculoId}/${tipo}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('archivos')
      .upload(path, file, { upsert: false })

    if (upErr) {
      setError(`Error al subir: ${upErr.message}`)
      setUploading(null)
      return
    }

    const { data: urlData } = supabase.storage.from('archivos').getPublicUrl(path)

    const { data: inserted, error: dbErr } = await supabase
      .from('archivos')
      .insert({
        tipo,
        url:         urlData.publicUrl,
        nombre:      file.name,
        vehiculo_id: vehiculoId,
        subido_por:  user.id,
      })
      .select()
      .single()

    if (dbErr || !inserted) {
      setError('Archivo subido pero no se pudo registrar en la base de datos.')
    } else {
      setArchivos(prev => [...prev, inserted as Archivo])
    }

    setUploading(null)
    // Limpiar el input para permitir subir el mismo archivo de nuevo
    if (inputRefs.current[tipo]) inputRefs.current[tipo]!.value = ''
  }

  async function handleDelete(archivo: Archivo) {
    setDeleting(archivo.id)
    // Extraer el path del storage desde la URL pública
    try {
      const url = new URL(archivo.url)
      const pathParts = url.pathname.split('/archivos/')
      if (pathParts[1]) {
        await supabase.storage.from('archivos').remove([pathParts[1]])
      }
    } catch { /* Si falla el delete del storage, igual borramos el registro */ }

    await supabase.from('archivos').delete().eq('id', archivo.id)
    setArchivos(prev => prev.filter(a => a.id !== archivo.id))
    setDeleting(null)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-oriental-black flex items-center gap-2">
          <FileText size={18} className="text-oriental-gray" />
          Documentos del vehículo
        </h2>
        <span className="text-xs text-oriental-gray bg-oriental-bg px-2.5 py-1 rounded-full">
          {archivos.length} archivo{archivos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIAS.map(({ tipo, label, icon: Icon, color, iconColor, badge }) => {
          const docs = archivos.filter(a => a.tipo === tipo)
          const isUploading = uploading === tipo

          return (
            <div key={tipo} className={`rounded-xl border p-4 flex flex-col gap-3 ${color}`}>
              {/* Header de categoría */}
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-oriental-black leading-tight">{label}</p>
                  <p className="text-[11px] text-oriental-gray">
                    {docs.length === 0 ? 'Sin documentos' : `${docs.length} archivo${docs.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {docs.length > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                    {docs.length}
                  </span>
                )}
              </div>

              {/* Lista de archivos */}
              {docs.length > 0 && (
                <div className="space-y-1.5">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 bg-white/60 rounded-lg px-2.5 py-2 group">
                      <FileText size={12} className="text-oriental-gray flex-shrink-0" />
                      <span className="text-[11px] text-oriental-black font-medium flex-1 truncate" title={NombreArchivo(doc.url, doc.nombre)}>
                        {NombreArchivo(doc.url, doc.nombre)}
                      </span>
                      <span className="text-[10px] text-oriental-gray flex-shrink-0">{formatFecha(doc.created_at)}</span>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Ver documento"
                      >
                        <ExternalLink size={12} className="text-oriental-gray hover:text-oriental-black transition-colors" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deleting === doc.id
                          ? <Loader2 size={12} className="animate-spin text-red-400" />
                          : <Trash2 size={12} className="text-red-400 hover:text-red-600 transition-colors" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón de subida */}
              <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-xs font-medium
                ${isUploading
                  ? 'border-gray-300 bg-white/40 text-gray-400 cursor-not-allowed'
                  : 'border-white/70 bg-white/40 hover:bg-white/70 hover:border-white text-oriental-gray hover:text-oriental-black'
                }`}>
                {isUploading
                  ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</>
                  : <><Upload size={13} /> Subir archivo</>
                }
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  disabled={isUploading}
                  ref={el => { inputRefs.current[tipo] = el }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(tipo, file)
                  }}
                />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
