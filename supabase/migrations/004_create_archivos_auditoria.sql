create table archivos (
  id         uuid primary key default uuid_generate_v4(),
  tipo       text not null,
  url        text not null,
  nombre     text,
  ingreso_id uuid references ingresos(id) on delete cascade,
  egreso_id  uuid references egresos(id) on delete cascade,
  subido_por uuid not null references usuarios(id),
  created_at timestamptz not null default now()
);

create index idx_archivos_ingreso on archivos(ingreso_id);
create index idx_archivos_egreso on archivos(egreso_id);

create table auditoria (
  id               uuid primary key default uuid_generate_v4(),
  usuario_id       uuid references usuarios(id),
  accion           text not null,
  modulo           text not null,
  registro_id      uuid,
  datos_anteriores jsonb,
  datos_nuevos     jsonb,
  ip               text,
  created_at       timestamptz not null default now()
);

create index idx_auditoria_usuario on auditoria(usuario_id);
create index idx_auditoria_modulo on auditoria(modulo);
create index idx_auditoria_fecha on auditoria(created_at);

-- Correlativos automáticos
create or replace function generar_numero_recibo()
returns trigger language plpgsql as $$
begin
  new.numero_recibo := 'JPLUS-REC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('seq_recibos')::text, 6, '0');
  return new;
end;
$$;

create trigger trg_numero_recibo
before insert on ingresos
for each row when (new.numero_recibo = '')
execute function generar_numero_recibo();

create or replace function generar_numero_egreso()
returns trigger language plpgsql as $$
begin
  new.numero_egreso := 'JPLUS-EGR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('seq_egresos')::text, 6, '0');
  return new;
end;
$$;

create trigger trg_numero_egreso
before insert on egresos
for each row when (new.numero_egreso = '')
execute function generar_numero_egreso();

-- updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_updated_clientes  before update on clientes  for each row execute function set_updated_at();
create trigger trg_updated_vehiculos before update on vehiculos for each row execute function set_updated_at();
create trigger trg_updated_ingresos  before update on ingresos  for each row execute function set_updated_at();
create trigger trg_updated_egresos   before update on egresos   for each row execute function set_updated_at();

-- RLS
alter table usuarios  enable row level security;
alter table clientes  enable row level security;
alter table vehiculos enable row level security;
alter table creditos  enable row level security;
alter table cuotas    enable row level security;
alter table ingresos  enable row level security;
alter table egresos   enable row level security;
alter table archivos  enable row level security;
alter table auditoria enable row level security;

create policy "auth_usuarios"  on usuarios  for select using (auth.role() = 'authenticated');
create policy "auth_clientes"  on clientes  for select using (auth.role() = 'authenticated');
create policy "auth_vehiculos" on vehiculos for select using (auth.role() = 'authenticated');
create policy "auth_ingresos"  on ingresos  for select using (auth.role() = 'authenticated');
create policy "auth_egresos"   on egresos   for select using (auth.role() = 'authenticated');
create policy "auth_creditos"  on creditos  for select using (auth.role() = 'authenticated');
create policy "auth_cuotas"    on cuotas    for select using (auth.role() = 'authenticated');
create policy "auth_archivos"  on archivos  for select using (auth.role() = 'authenticated');
create policy "auth_auditoria" on auditoria for select using (auth.role() = 'authenticated');
