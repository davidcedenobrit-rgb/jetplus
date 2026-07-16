-- Catálogo de cuentas (bancos, USDT por custodio, efectivo, etc.)
create table if not exists cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'banco',          -- banco | usdt | efectivo | otro
  moneda text not null default 'USD',           -- USD | VES | USDT
  custodio text,                                -- p.ej. "Carla Hernández" para USDT CH
  banco text,                                    -- nombre del banco si aplica
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Tabla de configuración: sin RLS, protegida por guardas de rol en páginas/acciones
alter table cuentas disable row level security;

-- Conciliación y cuenta en ingresos
alter table ingresos add column if not exists cuenta_id uuid references cuentas(id);
alter table ingresos add column if not exists conciliado boolean not null default false;
alter table ingresos add column if not exists conciliado_por text;
alter table ingresos add column if not exists conciliado_at timestamptz;

-- Conciliación y cuenta en egresos
alter table egresos add column if not exists cuenta_id uuid references cuentas(id);
alter table egresos add column if not exists conciliado boolean not null default false;
alter table egresos add column if not exists conciliado_por text;
alter table egresos add column if not exists conciliado_at timestamptz;

create index if not exists ingresos_cuenta_id_idx on ingresos(cuenta_id);
create index if not exists egresos_cuenta_id_idx on egresos(cuenta_id);

-- Semilla mínima (editable desde el panel de cuentas)
insert into cuentas (nombre, tipo, moneda, custodio, orden) values
  ('Efectivo USD', 'efectivo', 'USD', null, 1),
  ('Efectivo Bs.', 'efectivo', 'VES', null, 2),
  ('USDT CH', 'usdt', 'USDT', 'Carla Hernández', 3)
on conflict do nothing;
