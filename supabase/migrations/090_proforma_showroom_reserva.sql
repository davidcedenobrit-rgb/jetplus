-- 090_proforma_showroom_reserva.sql
-- Ventas Fase 2: al crear la proforma se puede elegir la UNIDAD física del
-- showroom y dejarla RESERVADA para ese cliente. La reserva usa las columnas
-- ya existentes de vehiculos_showroom (estado='reservado', reservado_por,
-- cliente_id, reserva_notas). Aquí solo guardamos el vínculo en la proforma.
-- Un cliente puede tener varias unidades: la reserva es por UNIDAD, no por cliente.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.proformas
  add column if not exists showroom_id uuid;

create index if not exists proformas_showroom_idx on public.proformas(showroom_id);
