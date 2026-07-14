// Trae TODAS las filas de una consulta paginando en lotes, para evitar el
// límite de 1000 filas de PostgREST/Supabase (que cortaría totales y listados
// silenciosamente). Sirve tanto para el cliente de navegador como el de servidor.
//
// Uso:
//   const filas = await fetchAllRows(
//     (from, to) => supabase.from('cuotas').select('...').gte(...).range(from, to)
//   )
//
// El callback DEBE aplicar la misma consulta (mismos filtros y orden) en cada
// llamada; sólo cambia el rango. Devuelve el arreglo completo.
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; ; i++) {
    const { data } = await build(i * pageSize, i * pageSize + pageSize - 1)
    if (!data || data.length === 0) break
    out.push(...(data as T[]))
    if (data.length < pageSize) break
  }
  return out
}
