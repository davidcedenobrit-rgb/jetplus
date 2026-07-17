-- 028_iva_ingresos_egresos.sql
-- Control de IVA integrado en las pantallas actuales de Ingresos y Egresos.
-- Campos aditivos y opcionales: por defecto el IVA no aplica, así que los
-- registros existentes y el flujo actual no cambian. `monto` sigue siendo el
-- TOTAL; base_imponible + iva_monto es su desglose cuando iva_aplica = true.
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.ingresos add column if not exists iva_aplica boolean not null default false;
alter table public.ingresos add column if not exists iva_tasa numeric(5,2);
alter table public.ingresos add column if not exists base_imponible numeric(14,2);
alter table public.ingresos add column if not exists iva_monto numeric(14,2);

alter table public.egresos add column if not exists iva_aplica boolean not null default false;
alter table public.egresos add column if not exists iva_tasa numeric(5,2);
alter table public.egresos add column if not exists base_imponible numeric(14,2);
alter table public.egresos add column if not exists iva_monto numeric(14,2);
