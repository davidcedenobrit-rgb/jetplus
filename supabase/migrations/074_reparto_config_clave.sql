-- Punto 8: el reparto de gastos comunes (%) queda bloqueado por un mes al
-- guardarse; solo Rojas puede desbloquearlo/modificarlo con una clave especial.
-- Config de una sola fila (id=1). Aplicar a AMBAS bases.

create table if not exists reparto_config (
  id              smallint primary key default 1,
  bloqueado_hasta timestamptz,
  clave_hash      text,
  updated_at      timestamptz not null default now(),
  constraint reparto_config_single check (id = 1)
);

alter table reparto_config disable row level security;

insert into reparto_config (id) values (1) on conflict (id) do nothing;
