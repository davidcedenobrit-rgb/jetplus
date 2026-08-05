-- Enlace de ingresos y egresos con el plan de cuentas contable.
-- Cada movimiento puede "alimentar" el plan de cuentas: un tilde (afecta_plan)
-- y el código de la cuenta seleccionada (cuenta_contable) + su nombre (snapshot,
-- para reportar sin depender de que el catálogo esté importado en BD).

alter table egresos
  add column if not exists afecta_plan boolean not null default true,
  add column if not exists cuenta_contable text,
  add column if not exists cuenta_contable_nombre text;

alter table ingresos
  add column if not exists afecta_plan boolean not null default true,
  add column if not exists cuenta_contable text,
  add column if not exists cuenta_contable_nombre text;

-- Índices para el reporte "Mayor por cuenta" (agrupa por código de cuenta).
create index if not exists idx_egresos_cuenta_contable
  on egresos (cuenta_contable) where cuenta_contable is not null;
create index if not exists idx_ingresos_cuenta_contable
  on ingresos (cuenta_contable) where cuenta_contable is not null;
