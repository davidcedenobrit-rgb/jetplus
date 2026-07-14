-- Fase 1 (Egresos/Finanzas) — Control de Pago Fijo (gastos recurrentes)
-- Espejo de la migración remota create_pagos_fijos.
-- Gastos que se repiten (alquiler, nómina, servicios): se registran una vez y
-- el sistema recuerda el próximo pago y permite generar el egreso del período.

create table if not exists pagos_fijos (
  id              uuid primary key default gen_random_uuid(),
  concepto        text not null,
  monto           numeric(14,2) not null,
  moneda          text not null default 'USD',
  frecuencia      text not null default 'mensual', -- semanal | quincenal | mensual | trimestral | anual
  dia_pago        integer,                          -- día del mes de referencia (1-31)
  centro_costo_id text references centros_costo(id),
  categoria       categoria_egreso,
  proveedor_id    uuid references proveedores(id),
  beneficiario    text,
  proximo_pago    date,
  activo          boolean not null default true,
  notas           text,
  ultimo_egreso_id uuid references egresos(id),
  ultimo_pago_at   timestamptz,
  created_at      timestamptz not null default now(),
  registrado_por  uuid
);

alter table pagos_fijos disable row level security;

create index if not exists idx_pagos_fijos_proximo on pagos_fijos(proximo_pago) where activo;
