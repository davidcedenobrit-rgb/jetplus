-- 030_ingresos_titular_fondos.sql
-- Separación de fondos: marca de quién es el dinero recibido.
--   propio     → ingreso real de La Oriental
--   vehimotors → dinero en custodia por entregar a Vehimotors (no es ingreso propio)
--   tercero    → otros fondos de terceros en custodia
-- Campo aditivo, default 'propio' (no cambia el flujo actual; reclasificable).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.ingresos
  add column if not exists titular_fondos text not null default 'propio';

alter table public.ingresos
  drop constraint if exists ingresos_titular_fondos_check;
alter table public.ingresos
  add constraint ingresos_titular_fondos_check
  check (titular_fondos in ('propio', 'vehimotors', 'tercero'));
