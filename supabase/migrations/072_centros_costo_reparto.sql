-- Fase 2 (Contabilidad) — Redefinir centros de costo + gastos comunes por %.
-- Según lineamiento de la contadora:
--   * Centros que generan ingreso (3 líneas separadas):
--       ventas    → "Ventas (comisiones)"
--       servicio  → "Ventas (servicio/taller)"
--       repuestos → "Venta de repuestos"
--   * Directiva  = solo gasto (no genera ingreso).
--   * Administración = gasto común (no es centro con ingreso propio); su gasto
--     se reparte por % entre los 3 centros de ingreso.
--   * Vehimotors = fondos de terceros (ya marcado es_propio=false en 057).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- Flags de clasificación del centro de costo
alter table centros_costo add column if not exists genera_ingreso boolean not null default true;
alter table centros_costo add column if not exists es_comun       boolean not null default false;

-- Renombrar las 3 líneas de ingreso
update centros_costo set nombre = 'Ventas (comisiones)'       where id = 'ventas';
update centros_costo set nombre = 'Ventas (servicio/taller)'  where id = 'servicio';
update centros_costo set nombre = 'Venta de repuestos'        where id = 'repuestos';

-- Directiva: solo gasto
update centros_costo set genera_ingreso = false where id = 'directiva';

-- Administración: gasto común (se reparte, no cuenta como ingreso propio).
-- Se activa para poder asignarle los gastos comunes al registrarlos.
update centros_costo set nombre = 'Administración (gasto común)', genera_ingreso = false, es_comun = true, activo = true where id = 'administracion';

-- Vehimotors nunca genera ingreso propio
update centros_costo set genera_ingreso = false where id = 'vehimotors';

-- Reparto único configurable de los gastos comunes entre los centros de ingreso.
-- Los porcentajes deben sumar 100. Editable desde el panel de configuración.
create table if not exists reparto_gastos_comunes (
  centro_costo_id text primary key references centros_costo(id) on delete cascade,
  porcentaje      numeric(5,2) not null default 0,
  updated_at      timestamptz not null default now()
);

alter table reparto_gastos_comunes disable row level security;

-- Semilla por defecto (34/33/33). Ajustable en configuración.
insert into reparto_gastos_comunes (centro_costo_id, porcentaje) values
  ('ventas',    34),
  ('servicio',  33),
  ('repuestos', 33)
on conflict (centro_costo_id) do nothing;
