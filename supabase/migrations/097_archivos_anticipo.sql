-- Comprobante(s) de un anticipo (imagen/PDF del pago), en la tabla archivos.
alter table public.archivos
  add column if not exists anticipo_id uuid references public.anticipos(id) on delete cascade;
create index if not exists idx_archivos_anticipo on public.archivos(anticipo_id);
