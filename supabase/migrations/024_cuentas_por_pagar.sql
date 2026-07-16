-- Cuentas por pagar: obligaciones a proveedores que se cargan a mano y se van
-- marcando como pagadas (ya no se derivan de los egresos ya ejecutados).
create table if not exists public.cuentas_por_pagar (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid references public.proveedores(id),
  beneficiario text not null,
  concepto text not null,
  categoria categoria_egreso,
  centro_costo_id text references public.centros_costo(id),
  monto numeric(14,2) not null,
  moneda text not null default 'USD',
  tasa_cambio numeric(14,4),
  fecha_emision date default current_date not null,
  fecha_limite date,
  estado text not null default 'pendiente',
  notas text,
  egreso_id uuid references public.egresos(id),
  pagada_at timestamptz,
  pagada_por text,
  registrado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cxp_estado_check check (estado in ('pendiente','pagada','anulada'))
);

create index if not exists cxp_estado_idx on public.cuentas_por_pagar(estado);
create index if not exists cxp_proveedor_idx on public.cuentas_por_pagar(proveedor_id);

alter table public.cuentas_por_pagar enable row level security;
create policy cxp_select on public.cuentas_por_pagar as permissive for select to authenticated using (true);

grant all on public.cuentas_por_pagar to anon, authenticated, service_role;
