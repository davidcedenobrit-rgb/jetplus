-- 038_compra_plaza_moneda.sql
-- Compra en plaza: moneda y tasa propias de la compra. Antes el monto_plaza
-- guardaba el número "pelado" y, si se pagaba en Bs, la pantalla lo mostraba con
-- "$". Ahora se guarda si la compra fue en USD o VES, y en VES la tasa (Bs/$)
-- del día para poder mostrar el equivalente en dólares.
-- Aditivo y opcional: las compras existentes quedan como USD (comportamiento
-- previo). Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.solicitudes_repuestos add column if not exists moneda_plaza text not null default 'USD';
alter table public.solicitudes_repuestos drop constraint if exists solicitudes_repuestos_moneda_plaza_check;
alter table public.solicitudes_repuestos add constraint solicitudes_repuestos_moneda_plaza_check
  check (moneda_plaza in ('USD', 'VES'));
alter table public.solicitudes_repuestos add column if not exists tasa_plaza numeric(14,4);
