-- 082_precompra_proformas.sql
-- Precompra (AC500) Fase 3: proforma de compra programada.
-- Nace de una cotización AC500, exige datos completos + documentos anexos,
-- y alimenta el Anexo A (Oriental / Vehimotors). Los documentos también se
-- guardan en el perfil del cliente.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

create table if not exists public.precompra_proformas (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references public.cotizaciones(id),
  cliente_id uuid,
  vehiculo_id uuid,
  concesionario_id text,
  -- Identidad completa (obligatoria para pasar de cotización a proforma)
  tipo_persona text not null default 'natural',
  cliente_nombre text not null,
  cliente_cedula text,
  cliente_rif text,
  cliente_direccion text,
  cliente_telefono text,
  cliente_correo text,
  estado_civil text,
  conyuge jsonb,                        -- { nombre, cedula, rif }
  registro_mercantil text,              -- persona jurídica
  -- Vehículo / plan
  marca text,
  modelo text,
  unidad text,
  colores text,
  meses int,
  ciclo int,
  fecha_plan date,
  reserva numeric not null default 500,
  cuotas jsonb,                         -- montos base cuotas 1..5 (con los $500 en la 1)
  cuota_final numeric not null default 0, -- cuota 6 (IVA, IGTF, matriculación)
  valor_venta numeric not null default 0,
  total_pagar numeric not null default 0,
  serie_cobertura text,
  -- Documentos anexos: [{ tipo, path, nombre, subido_at }]
  documentos jsonb not null default '[]'::jsonb,
  estado text not null default 'borrador', -- borrador | completa | enviada | contrato_recibido
  notas text,
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists precompra_proformas_cotizacion_idx on public.precompra_proformas(cotizacion_id);
create index if not exists precompra_proformas_cliente_idx on public.precompra_proformas(cliente_id);
create index if not exists precompra_proformas_estado_idx on public.precompra_proformas(estado);

alter table public.precompra_proformas enable row level security;

drop policy if exists precompra_proformas_staff_all on public.precompra_proformas;
create policy precompra_proformas_staff_all on public.precompra_proformas
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());

-- Documentos en el perfil del cliente: [{ tipo, path, nombre, origen, subido_at }]
alter table public.clientes add column if not exists documentos jsonb not null default '[]'::jsonb;
