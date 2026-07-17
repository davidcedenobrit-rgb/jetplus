-- 034_inspecciones_vehiculo.sql
-- Procesos de showroom: recepción (en grúa), chequeo y PDI (pre-entrega).
-- Cada inspección se guarda como un registro con su checklist en JSON, atado a
-- un vehículo de showroom. Formatos estándar v1 (Rojas puede afinarlos luego).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

create table if not exists public.inspecciones_vehiculo (
  id uuid primary key default gen_random_uuid(),
  showroom_vehiculo_id uuid references public.vehiculos_showroom(id) on delete cascade,
  tipo text not null check (tipo in ('recepcion', 'chequeo', 'pdi')),
  datos jsonb not null default '{}'::jsonb,      -- campos generales (km, combustible, quién recibió…)
  items jsonb not null default '[]'::jsonb,       -- checklist [{clave,label,estado,nota}]
  realizado_por text,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists inspecciones_vehiculo_veh_idx on public.inspecciones_vehiculo(showroom_vehiculo_id);
create index if not exists inspecciones_vehiculo_tipo_idx on public.inspecciones_vehiculo(tipo);

alter table public.inspecciones_vehiculo enable row level security;
drop policy if exists inspecciones_vehiculo_auth_all on public.inspecciones_vehiculo;
create policy inspecciones_vehiculo_auth_all on public.inspecciones_vehiculo
  as permissive for all to authenticated using (true) with check (true);
revoke all on public.inspecciones_vehiculo from anon;
grant all on public.inspecciones_vehiculo to authenticated, service_role;
