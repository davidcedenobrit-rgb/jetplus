-- 035_vinculaciones_asignaciones.sql
-- Módulo "Asignaciones y Ventas" (Vehimotors): flujo fase a fase (estilo SORE)
-- desde que se asigna el cliente a un vehículo hasta que llega la factura de VH.
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- N° SA (número de proforma para facturación) guardado en el vehículo
alter table public.vehiculos add column if not exists numero_sa text;

create table if not exists public.vinculaciones (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  numero_sa text,
  tipo_venta text,                 -- contado | financiado | ...
  monto_proforma numeric(14,2),
  moneda text default 'USD',
  estado text not null default 'asignado'
    check (estado in ('asignado','en_facturacion','factura_recibida','completado','anulado')),
  correo_facturacion text,         -- destinatario usado al enviar a facturar
  asignado_at timestamptz not null default now(),
  facturado_at timestamptz,
  creado_por text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vinculaciones_estado_idx on public.vinculaciones(estado);
create index if not exists vinculaciones_vehiculo_idx on public.vinculaciones(vehiculo_id);
create index if not exists vinculaciones_cliente_idx on public.vinculaciones(cliente_id);

create table if not exists public.vinculaciones_historial (
  id uuid primary key default gen_random_uuid(),
  vinculacion_id uuid not null references public.vinculaciones(id) on delete cascade,
  estado_nuevo text,
  usuario_email text,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists vinculaciones_historial_idx on public.vinculaciones_historial(vinculacion_id);

alter table public.vinculaciones enable row level security;
alter table public.vinculaciones_historial enable row level security;
do $$ begin
  drop policy if exists vinculaciones_auth on public.vinculaciones;
  create policy vinculaciones_auth on public.vinculaciones as permissive for all to authenticated using (true) with check (true);
  drop policy if exists vinculaciones_hist_auth on public.vinculaciones_historial;
  create policy vinculaciones_hist_auth on public.vinculaciones_historial as permissive for all to authenticated using (true) with check (true);
end $$;
revoke all on public.vinculaciones from anon;
revoke all on public.vinculaciones_historial from anon;
grant all on public.vinculaciones, public.vinculaciones_historial to authenticated, service_role;
