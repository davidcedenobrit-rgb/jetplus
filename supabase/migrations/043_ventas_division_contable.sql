-- 043_ventas_division_contable.sql
-- División contable por venta (flujo nuevo de ventas):
--   Precio de venta (X)  −  Pago a Vehimotors (Y)  =  Directiva
--   Comisión (Z): variable, calculada sobre X.
-- Una fila por vehículo vendido. Editable solo a nivel dirección.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

create table if not exists public.ventas_division_contable (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete cascade,
  proforma_id uuid references public.proformas(id),
  cotizacion_id uuid references public.cotizaciones(id),
  cliente_id uuid,
  precio_venta numeric not null default 0,       -- X
  pago_vehimotors numeric not null default 0,    -- Y
  comision_pct numeric not null default 0,       -- % sobre X
  comision_monto numeric not null default 0,     -- Z
  vendedora text,
  reportado_vm boolean not null default false,
  notas text,
  actualizado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehiculo_id)
);

create index if not exists ventas_division_vehiculo_idx on public.ventas_division_contable(vehiculo_id);
create index if not exists ventas_division_proforma_idx on public.ventas_division_contable(proforma_id);
