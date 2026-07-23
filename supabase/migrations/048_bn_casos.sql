-- Bandeja de casos "Banca Nacional — Vehimotors": el cliente entrega su
-- expediente, se somete al banco vía Vehimotors, y cuando aprueban un % Rojas
-- coloca la merma del día y genera la cotización.
create table if not exists bn_casos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid,
  concesionario_id text,
  cliente_id uuid,
  cliente_nombre text not null,
  cliente_ci_rif text not null,
  cliente_correo text,
  cliente_telefono text,
  cliente_direccion text,
  cliente_ciudad_estado text,
  cliente_codigo_postal text,
  vehiculo_id text,
  marca text,
  modelo text,
  precio_base numeric not null default 0,
  placa_monto numeric not null default 400,
  estado text not null default 'pendiente_vm',  -- pendiente_vm | cotizado | rechazado
  aprobado_pct numeric,        -- % que aprobó el banco (sobre el total banco)
  merma_pct numeric,           -- % de merma/conversión del día que coloca Rojas
  gastos_estructura jsonb,     -- líneas de gastos editadas
  condiciones text,
  notas text,
  cotizacion_id uuid,
  cotizado_at timestamptz
);
create index if not exists idx_bn_casos_estado on bn_casos(estado);

-- Desglose Banca Nacional guardado en la cotización/proforma para el cuadro del PDF.
alter table cotizaciones add column if not exists bn_vehimotors jsonb;
alter table proformas add column if not exists bn_vehimotors jsonb;
