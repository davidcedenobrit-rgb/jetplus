-- EXTENSION
create extension if not exists "uuid-ossp";

-- ENUM: roles
create type rol_usuario as enum ('jose', 'mary', 'leysdem', 'carla', 'admin');

-- ENUM: estados recibo
create type estado_recibo as enum (
  'registrado','pendiente_aprobacion','aprobado','rechazado',
  'correccion_requerida','enviado_cliente','enviado_carla',
  'listo_depositar','enviado_deposito','depositado',
  'reportado_vehimotors','anulado'
);

-- ENUM: estados egreso
create type estado_egreso as enum (
  'registrado','pendiente_aprobacion','aprobado','rechazado',
  'correccion_requerida','pagado','reportado_carla',
  'reportado_vehimotors','anulado'
);

create type tipo_cliente as enum ('natural','juridico');
create type tipo_compra as enum ('contado','credito','financiamiento');
create type marca_vehiculo as enum ('MG','MAXUS');
create type moneda as enum ('USD','VES');
create type categoria_egreso as enum (
  'gastos_administrativos','proveedores','tramites_vehiculares',
  'impuestos','seguro','logistica','mantenimiento','comisiones',
  'servicios','vehimotors','bancos_comisiones','otros'
);

-- TABLA: usuarios
create table usuarios (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  correo        text not null unique,
  rol           rol_usuario not null,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  ultimo_acceso timestamptz
);

-- TABLA: clientes
create table clientes (
  id            uuid primary key default uuid_generate_v4(),
  nombre        text not null,
  cedula_rif    text not null unique,
  telefono      text,
  whatsapp      text,
  correo        text,
  direccion     text,
  ciudad        text,
  tipo          tipo_cliente not null default 'natural',
  observaciones text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- TABLA: vehiculos
create table vehiculos (
  id              uuid primary key default uuid_generate_v4(),
  cliente_id      uuid not null references clientes(id) on delete restrict,
  marca           marca_vehiculo not null,
  modelo          text not null,
  version         text,
  anio            int,
  color           text,
  placa           text unique,
  vin             text,
  fecha_entrega   date,
  tipo_compra     tipo_compra not null default 'contado',
  estado          text not null default 'activo',
  observaciones   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_vehiculos_cliente on vehiculos(cliente_id);
create index idx_vehiculos_placa on vehiculos(placa);
