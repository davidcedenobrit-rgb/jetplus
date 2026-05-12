create sequence seq_recibos start 1;
create sequence seq_egresos start 1;

create table ingresos (
  id                  uuid primary key default uuid_generate_v4(),
  numero_recibo       text not null unique default '',
  cliente_id          uuid not null references clientes(id) on delete restrict,
  vehiculo_id         uuid references vehiculos(id) on delete restrict,
  cuota_id            uuid references cuotas(id) on delete set null,
  placa               text,
  concepto            text not null,
  monto               numeric(14,2) not null,
  moneda              moneda not null default 'USD',
  metodo_pago         text not null,
  fecha_pago          date not null,
  referencia          text,
  banco_emisor        text,
  banco_receptor      text,
  estado              estado_recibo not null default 'registrado',
  observaciones       text,
  registrado_por      uuid not null references usuarios(id),
  aprobado_por        uuid references usuarios(id),
  fecha_registro      timestamptz not null default now(),
  fecha_aprobacion    timestamptz,
  enviado_carla_at    timestamptz,
  deposito_at         timestamptz,
  vehimotors_at       timestamptz,
  updated_at          timestamptz not null default now()
);

create index idx_ingresos_cliente on ingresos(cliente_id);
create index idx_ingresos_placa on ingresos(placa);
create index idx_ingresos_estado on ingresos(estado);
create index idx_ingresos_fecha on ingresos(fecha_pago);

create table egresos (
  id                  uuid primary key default uuid_generate_v4(),
  numero_egreso       text not null unique default '',
  categoria           categoria_egreso not null,
  concepto            text not null,
  descripcion         text,
  monto               numeric(14,2) not null,
  moneda              moneda not null default 'USD',
  metodo_pago         text,
  banco_origen        text,
  beneficiario        text,
  cedula_rif_benef    text,
  referencia          text,
  estado              estado_egreso not null default 'registrado',
  observaciones       text,
  cliente_id          uuid references clientes(id) on delete set null,
  vehiculo_id         uuid references vehiculos(id) on delete set null,
  placa               text,
  ingreso_id          uuid references ingresos(id) on delete set null,
  area_responsable    text,
  registrado_por      uuid not null references usuarios(id),
  aprobado_por        uuid references usuarios(id),
  fecha_egreso        date not null,
  fecha_registro      timestamptz not null default now(),
  fecha_aprobacion    timestamptz,
  reportado_carla_at  timestamptz,
  vehimotors_at       timestamptz,
  updated_at          timestamptz not null default now()
);

create index idx_egresos_categoria on egresos(categoria);
create index idx_egresos_estado on egresos(estado);
create index idx_egresos_placa on egresos(placa);
create index idx_egresos_fecha on egresos(fecha_egreso);
