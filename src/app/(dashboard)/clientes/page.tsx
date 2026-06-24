import { createClient } from '@/lib/supabase/server'
import { sanitizeSearch } from '@/lib/utils'
import Link from 'next/link'
import { Plus, User, Search, Phone, Mail } from 'lucide-react'

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select('*, vehiculos(id)')
    .eq('activo', true)
    .order('nombre')

  if (params.q) {
    const q = sanitizeSearch(params.q)
    if (q) query = query.or(`nombre.ilike.%${q}%,cedula_rif.ilike.%${q}%`)
  }
  if (params.tipo) {
    query = query.eq('tipo', params.tipo)
  }

  const { data: clientes } = await query

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-oriental-black">Clientes</h1>
          <p className="text-oriental-gray text-sm mt-1">{clientes?.length ?? 0} clientes activos</p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo cliente
        </Link>
      </div>

      {/* Buscador */}
      <form action="/clientes" method="GET" className="mb-4">
        {params.tipo && <input type="hidden" name="tipo" value={params.tipo} />}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-oriental-gray pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Buscar por nombre o cédula / RIF..."
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-oriental-black placeholder-gray-400 focus:outline-none focus:border-oriental-red focus:ring-1 focus:ring-oriental-red/20 transition-colors"
          />
          {params.q && (
            <Link
              href={params.tipo ? `/clientes?tipo=${params.tipo}` : '/clientes'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oriental-red transition-colors"
              title="Limpiar búsqueda"
            >
              ✕
            </Link>
          )}
        </div>
        {params.q && (
          <p className="text-xs text-oriental-gray mt-1.5 ml-1">
            {clientes?.length ?? 0} resultado{(clientes?.length ?? 0) !== 1 ? 's' : ''} para <span className="font-semibold text-oriental-black">"{params.q}"</span>
          </p>
        )}
      </form>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'Todos' },
          { value: 'natural', label: 'Persona natural' },
          { value: 'juridico', label: 'Persona jurídica' },
        ].map(f => (
          <Link
            key={f.value}
            href={f.value
              ? `/clientes?tipo=${f.value}${params.q ? `&q=${params.q}` : ''}`
              : `/clientes${params.q ? `?q=${params.q}` : ''}`
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              params.tipo === f.value || (!params.tipo && !f.value)
                ? 'bg-oriental-black text-white border-oriental-black'
                : 'bg-white text-oriental-gray border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map(cliente => (
          <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
            <div className="card p-5 hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-oriental-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-oriental-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-oriental-black truncate">{cliente.nombre}</p>
                  <p className="text-sm text-oriental-gray">{cliente.cedula_rif}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {cliente.telefono && (
                      <span className="flex items-center gap-1"><Phone size={10} /> {cliente.telefono}</span>
                    )}
                    <span>{(cliente as any).vehiculos?.length ?? 0} vehículo(s)</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  cliente.tipo === 'juridico' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cliente.tipo === 'juridico' ? 'Jurídico' : 'Natural'}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {(!clientes || clientes.length === 0) && (
          <div className="col-span-3 text-center py-16">
            <Search size={32} className="mx-auto text-gray-300 mb-3" />
            {params.q ? (
              <>
                <p className="text-oriental-gray text-sm">Sin resultados para <span className="font-semibold text-oriental-black">"{params.q}"</span></p>
                <Link href="/clientes" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                  Ver todos los clientes
                </Link>
              </>
            ) : (
              <>
                <p className="text-oriental-gray text-sm">No hay clientes registrados</p>
                <Link href="/clientes/nuevo" className="text-oriental-red text-sm font-medium hover:underline mt-1 inline-block">
                  Registrar el primero
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
