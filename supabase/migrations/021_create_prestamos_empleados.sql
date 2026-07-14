-- Extras — Préstamos a empleados (#37)
-- Registra préstamos/adelantos a empleados y sus abonos. El saldo pendiente se
-- calcula como monto - suma(abonos). Al desembolsar puede generarse un egreso
-- (cuenta por cobrar) enlazado.

create table if not exists prestamos_empleados (
  id             uuid primary key default gen_random_uuid(),
  empleado_id    uuid not null references empleados(id) on delete cascade,
  monto          numeric(14,2) not null,
  moneda         text not null default 'USD',
  tasa_cambio    numeric(14,4),
  motivo         text,
  fecha          date not null default current_date,
  egreso_id      uuid references egresos(id),
  registrado_por uuid,
  created_at     timestamptz not null default now()
);

create table if not exists prestamos_abonos (
  id             uuid primary key default gen_random_uuid(),
  prestamo_id    uuid not null references prestamos_empleados(id) on delete cascade,
  monto          numeric(14,2) not null,
  fecha          date not null default current_date,
  nota           text,
  registrado_por uuid,
  created_at     timestamptz not null default now()
);

alter table prestamos_empleados disable row level security;
alter table prestamos_abonos disable row level security;

create index if not exists idx_prestamos_empleado on prestamos_empleados(empleado_id);
create index if not exists idx_prestamos_abonos_prestamo on prestamos_abonos(prestamo_id);
