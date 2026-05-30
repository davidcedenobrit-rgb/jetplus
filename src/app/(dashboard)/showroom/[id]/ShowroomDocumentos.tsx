'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, ExternalLink, Loader2, Trash2, Wrench, ShieldCheck, ClipboardList, Award, FileSignature } from 'lucide-react'

const CATEGORIAS_PREVENTA = [
  { tipo: 'pdi',                    label: 'PDI',                         icon: Wrench,        color: 'bg-slate-50 border-slate-100',   iconColor: 'text-slate-500',   badge: 'bg-slate-100 text-slate-700' },
  { tipo: 'autorizacion_consig',    label: 'Autorización de Consignación', icon: ShieldCheck,   color: 'bg-blue-50 border-blue-100',     iconColor: 'text-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  { tipo: 'proforma',               label: 'Proforma',                    icon: ClipboardList, color: 'bg-teal-50 border-teal-100',     iconColor: 'text-teal-500',    badge: 'bg-teal-100 text-teal-700' },
  { tipo: 'certificado_origen',     label: 'Certificado de Origen',       icon: Award,         color: 'bg-emerald-50 border-emerald-100', iconColor: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { tipo: 'contrato_consignacion',  label: 'Contrato de Consignación',    icon: FileSignature, color: 'bg-amber-50 border-amber-100',   iconColor: 'text-amber-500',   badge: 'bg-amber-100 text-amber-700' },
] as const

type Archivo = { id: string; tipo: string; url: string; nombre: string | null; created_at: string }

interface Props {
  showroomId: string
  archivosIniciales: Archivo[]
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nombreArchivo(url: string, nombre: string | null) {
  if (nombre) return nombre
  try { return decodeURIComponent(url.split('/').pop() ?? 'Documento') } catch { return 'Documento' }
}

export default function ShowroomDocumentos({ showroomId, archivosIniciales }: Props) {
  const supabase = createClient()
  const [archivos, setArchivos] = useState<Archivo[]>(archivosIniciales)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleUpload(tipo: string, file: File) {
    setError(null)
    setUploading(tipo)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada'); setUploading(null); return }

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `showroom/${showroomId}/${tipo}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false })
    if (upErr) { setError(`Error al subir: ${upErr.message}`); setUploading(null); return }

    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)

    const { data: inserted, error: dbErr } = await supabase
      .from('archivos')
      .insert({ tipo, url: urlData.publicUrl, nombre: file.name, showroom_vehiculo_id: showroomId, subido_por: user.id })
      .select().single()

    if (dbErr || !inserted) setError('Archivo subido pero no se pudo registrar.')
    else setArchivos(prev => [...prev, inserted as Archivo])

    setUploading(null)
    if (inputRefs.current[tipo]) inputRefs.current[tipo]!.value = ''
  }

  async function handleDelete(archivo: Archivo) {
    setDeleting(archivo.id)
    try {
      const url = new URL(archivo.url)
      const pathParts = url.pathname.split('/comprobantes/')
      if (pathParts[1]) await supabase.storage.from('comprobantes').remove([pathParts[1]])
    } catch { /* continuar */ }
    await supabase.from('archivos').delete().eq('id', archivo.id)
    setArchivos(prev => prev.filter(a => a.id !== archivo.id))
    setDeleting(null)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-oriental-black flex items-center gap-2">
          <FileText size={18} className="text-oriental-gray" />
          Documentos preventa
        </h2>
        <span className="text-xs text-oriental-gray bg-oriental-bg px-2.5 py-1 rounded-full">
          {archivos.length} archivo{archivos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIAS_PREVENTA.map(({ tipo, label, icon: Icon, color, iconColor, badge }) => {
          const docs = archivos.filter(a => a.tipo === tipo)
          const isUploading = uploading === tipo
          return (
            <div key={tipo} className={`rounded-xl border p-4 flex flex-col gap-3 ${color}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-oriental-black leading-tight">{label}</p>
                  <p className="text-[11px] text-oriental-gray">{docs.length === 0 ? 'Sin documentos' : `${docs.length} archivo${docs.length !== 1 ? 's' : ''}`}</p>
                </div>
                {docs.length > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{docs.length}</span>}
              </div>

              {docs.length > 0 && (
                <div className="space-y-1.5">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 bg-white/60 rounded-lg px-2.5 py-2 group">
                      <FileText size={12} className="text-oriental-gray flex-shrink-0" />
                      <span className="text-[11px] text-oriental-black font-medium flex-1 truncate" title={nombreArchivo(doc.url, doc.nombre)}>
                        {nombreArchivo(doc.url, doc.nombre)}
                      </span>
                      <span className="text-[10px] text-oriental-gray flex-shrink-0">{fmtFecha(doc.created_at)}</span>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={12} className="text-oriental-gray hover:text-oriental-black" />
                      </a>
                      <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                        {deleting === doc.id
                          ? <Loader2 size={12} className="animate-spin text-red-400" />
                          : <Trash2 size={12} className="text-red-400 hover:text-red-600" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-xs font-medium
                ${isUploading ? 'border-gray-300 bg-white/40 text-gray-400 cursor-not-allowed' : 'border-white/70 bg-white/40 hover:bg-white/70 hover:border-white text-oriental-gray hover:text-oriental-black'}`}>
                {isUploading ? <><Loader2 size={13} className="animate-spin" /> Subiendo...</> : <><Upload size={13} /> Subir archivo</>}
                <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" disabled={isUploading}
                  ref={el => { inputRefs.current[tipo] = el }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(tipo, f) }} />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
