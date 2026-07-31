-- 085_ac500_contabilidad.sql
-- Precompra (AC500) Fase 6 — porcentaje del carro que va a CONTABILIDAD.
-- Reglas: MG3 sincrónico (MT) y T60 Comfort 4x2 → 4%; resto → 5%.
-- Base = sumatoria de cuota 1 a cuota 5. Se registra automáticamente al
-- pagar la cuota 1 (mismo disparo que los $500 de la bóveda).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

create table if not exists public.contabilidad_ingresos (
  id uuid primary key default gen_random_uuid(),
  origen text not null,                 -- 'ac500_porcentaje' | ...
  concepto text,
  monto numeric not null default 0,
  moneda text not null default 'USD',
  porcentaje numeric,                   -- 4 | 5
  base_calculo numeric,                 -- suma cuotas 1..5
  proforma_id uuid references public.precompra_proformas(id),
  cliente_nombre text,
  vehiculo text,
  concesionario_id text,
  referencia text,
  creado_por uuid,
  created_at timestamptz not null default now()
);

create index if not exists contabilidad_ingresos_origen_idx on public.contabilidad_ingresos(origen);
create index if not exists contabilidad_ingresos_proforma_idx on public.contabilidad_ingresos(proforma_id);
create index if not exists contabilidad_ingresos_fecha_idx on public.contabilidad_ingresos(created_at);

alter table public.contabilidad_ingresos enable row level security;

drop policy if exists contabilidad_ingresos_staff_all on public.contabilidad_ingresos;
create policy contabilidad_ingresos_staff_all on public.contabilidad_ingresos
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());

alter table public.precompra_proformas
  add column if not exists pct_contabilidad numeric,
  add column if not exists base_contabilidad numeric,
  add column if not exists monto_contabilidad numeric;
