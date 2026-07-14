import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import DocumentosEmpresaClient from './DocumentosEmpresaClient'
import { FolderOpen } from 'lucide-react'

export default async function DocumentosEmpresaPage() {
  const supabase = await createClient()
  const documentos = await fetchAllRows<any>((from, to) => supabase
    .from('archivos')
    .select('*')
    .eq('es_empresa', true)
    .order('created_at', { ascending: false })
    .range(from, to))

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-oriental-red/10 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} className="text-oriental-red" />
          </div>
          <h1 className="text-2xl font-bold text-oriental-black">Documentación de Empresa</h1>
        </div>
        <p className="text-oriental-gray text-sm ml-13">La Oriental Automotors C.A. — documentos corporativos</p>
      </div>

      <DocumentosEmpresaClient documentosIniciales={documentos ?? []} />
    </div>
  )
}
