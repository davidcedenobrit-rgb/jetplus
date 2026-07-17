-- 029_ingresos_centro_costo.sql
-- Centro de costo en Ingresos (Egresos ya lo tenía desde 013). Campo aditivo y
-- opcional: no cambia el flujo actual. Referencia el catálogo centros_costo.
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.ingresos
  add column if not exists centro_costo_id text references public.centros_costo(id);
