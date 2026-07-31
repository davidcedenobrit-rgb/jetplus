-- 087_leads_captacion.sql
-- Captación de clientes desde el link público de ventas (/ventas).
-- El cliente pide su "cotización rápida" y deja sus datos; queda registrado
-- con el vendedor y el evento de donde viene (por parámetros del link/QR).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

create table if not exists public.leads_captacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  correo text,
  marca text,
  modelo text,
  presupuesto text,
  modalidad text,               -- interés: contado | credito | ac500
  vendedor text,                -- de qué vendedor viene (param del link)
  evento text,                  -- de qué evento viene (param del link)
  origen text not null default 'ventas_web',
  concesionario_id text,
  atendido boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists leads_captacion_fecha_idx on public.leads_captacion(created_at);
create index if not exists leads_captacion_evento_idx on public.leads_captacion(evento);
create index if not exists leads_captacion_vendedor_idx on public.leads_captacion(vendedor);

alter table public.leads_captacion enable row level security;

-- Solo el staff puede leer/gestionar; la inserción pública se hace por el
-- endpoint /api/leads con service role (no se expone la tabla al anónimo).
drop policy if exists leads_captacion_staff_all on public.leads_captacion;
create policy leads_captacion_staff_all on public.leads_captacion
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());
