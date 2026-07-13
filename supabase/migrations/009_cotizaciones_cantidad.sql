-- Cantidad de vehículos en la cotización (independiente del stock de showroom).
-- Los montos se guardan por unidad; el total por N se calcula al mostrar.
alter table public.cotizaciones
  add column if not exists cantidad integer not null default 1;

alter table public.cotizaciones
  drop constraint if exists cotizaciones_cantidad_check;
alter table public.cotizaciones
  add constraint cotizaciones_cantidad_check check (cantidad >= 1);

notify pgrst, 'reload schema';
