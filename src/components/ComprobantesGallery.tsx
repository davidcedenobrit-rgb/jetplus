'use client'

import { useState } from 'react'
import { ImageIcon, X, ZoomIn } from 'lucide-react'
import type { Archivo } from '@/types/database'

interface Props {
  archivos: Archivo[]
}

export default function ComprobantesGallery({ archivos }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (archivos.length === 0) return null

  return (
    <>
      <div className="card p-5">
        <h3 className="text-sm font-bold text-oriental-black mb-3">
          Comprobantes ({archivos.length})
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {archivos.map(a => (
            <div key={a.id} className="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-200">
              {a.url.match(/\.pdf$/i) ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="w-full h-24 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                  <div className="text-center">
                    <ImageIcon size={20} className="mx-auto text-oriental-gray" />
                    <p className="text-[10px] text-oriental-gray mt-1 truncate max-w-[100px] px-1">{a.nombre ?? 'PDF'}</p>
                  </div>
                </a>
              ) : (
                <div onClick={() => setLightbox(a.url)}>
                  <img src={a.url} alt={a.nombre ?? 'Comprobante'} className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={lightbox}
            alt="Comprobante"
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
