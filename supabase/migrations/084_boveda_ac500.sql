-- 084_boveda_ac500.sql
-- Precompra (AC500) Fase 6 — Bóveda:
-- Los $500 fijos por carro entran a la BÓVEDA cuando el cliente paga la cuota 1.
-- (El porcentaje del carro que va a CONTABILIDAD se define aparte, no aquí.)
-- La bóveda se abre con comando de voz + clave secreta, solo Rojas (rol jose).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

-- Ledger de la bóveda: cada ingreso que "cae" en la bóveda.
create table if not exists public.boveda_ingresos (
  id uuid primary key default gen_random_uuid(),
  origen text not null,                 -- 'ac500_cuota1' | 'ajuste' | ...
  concepto text,                        -- descripción legible
  monto numeric not null default 0,
  moneda text not null default 'USD',
  proforma_id uuid references public.precompra_proformas(id),
  cliente_nombre text,
  vehiculo text,                        -- marca + modelo
  concesionario_id text,
  referencia text,
  creado_por uuid,
  created_at timestamptz not null default now()
);

create index if not exists boveda_ingresos_origen_idx on public.boveda_ingresos(origen);
create index if not exists boveda_ingresos_proforma_idx on public.boveda_ingresos(proforma_id);
create index if not exists boveda_ingresos_fecha_idx on public.boveda_ingresos(created_at);

alter table public.boveda_ingresos enable row level security;

drop policy if exists boveda_ingresos_staff_all on public.boveda_ingresos;
create policy boveda_ingresos_staff_all on public.boveda_ingresos
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());

-- Registro del pago de la cuota 1 en la proforma (dispara el ingreso a bóveda).
alter table public.precompra_proformas
  add column if not exists cuota1_pagada boolean not null default false,
  add column if not exists cuota1_pagada_at timestamptz,
  add column if not exists cuota1_monto_boveda numeric not null default 500;
