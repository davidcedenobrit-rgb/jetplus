-- Bases de datos — Materiales e insumos (#33) y Obsequios a clientes (#34)

create table if not exists materiales_insumos (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  categoria          text,
  unidad             text,
  stock              numeric(14,2),
  precio_referencia  numeric(14,2),
  moneda             text default 'USD',
  proveedor          text,
  notas              text,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table materiales_insumos disable row level security;
create index if not exists idx_materiales_nombre on materiales_insumos (lower(nombre));

create table if not exists obsequios_clientes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid references clientes(id),
  cliente_nombre text,
  descripcion    text not null,
  motivo         text,
  fecha          date not null default current_date,
  valor          numeric(14,2),
  moneda         text default 'USD',
  entregado_por  text,
  notas          text,
  registrado_por uuid,
  created_at     timestamptz not null default now()
);
alter table obsequios_clientes disable row level security;
create index if not exists idx_obsequios_cliente on obsequios_clientes(cliente_id);
create index if not exists idx_obsequios_fecha on obsequios_clientes(fecha);
