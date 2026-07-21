-- 041_proformas_desde_cotizacion.sql
-- Permite que una PROFORMA nazca de una COTIZACIÓN aceptada (flujo nuevo de
-- ventas), no solo de un crédito ya existente. La proforma es la cotización
-- aprobada + el texto de condiciones de pago del cliente.
--   · credito_id pasa a ser opcional (una proforma pre-venta aún no tiene crédito).
--   · cotizacion_id: de qué cotización nació (FK, opcional).
-- Las proformas existentes (atadas a crédito) no cambian. Aplicar a AMBAS bases.

alter table public.proformas alter column credito_id drop not null;
-- En pre-venta el cliente puede aún no estar registrado como `cliente` (la
-- cotización guarda sus datos como snapshot). cliente_id pasa a ser opcional.
alter table public.proformas alter column cliente_id drop not null;
alter table public.proformas add column if not exists cotizacion_id uuid references public.cotizaciones(id);
create index if not exists proformas_cotizacion_id_idx on public.proformas(cotizacion_id);
