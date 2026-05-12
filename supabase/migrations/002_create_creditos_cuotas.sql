create table creditos (
  id                uuid primary key default uuid_generate_v4(),
  cliente_id        uuid not null references clientes(id) on delete restrict,
  vehiculo_id       uuid not null references vehiculos(id) on delete restrict,
  placa             text,
  monto_financiado  numeric(14,2) not null,
  inicial           numeric(14,2) not null default 0,
  saldo             numeric(14,2) not null,
  num_cuotas        int not null,
  frecuencia_pago   text not null default 'mensual',
  fecha_inicio      date not null,
  moneda            moneda not null default 'USD',
  estado            text not null default 'activo',
  observaciones     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_creditos_cliente on creditos(cliente_id);
create index idx_creditos_vehiculo on creditos(vehiculo_id);

create table cuotas (
  id                uuid primary key default uuid_generate_v4(),
  credito_id        uuid not null references creditos(id) on delete cascade,
  numero_cuota      int not null,
  fecha_vencimiento date not null,
  monto             numeric(14,2) not null,
  estado            text not null default 'pendiente',
  fecha_pago        timestamptz,
  mora              numeric(14,2) default 0,
  observaciones     text,
  created_at        timestamptz not null default now()
);

create index idx_cuotas_credito on cuotas(credito_id);
create index idx_cuotas_estado on cuotas(estado);
