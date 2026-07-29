-- Retención de ISLR en egresos (espejo de la de IVA). La Oriental, como agente
-- de retención, retiene ISLR sobre servicios y le emite comprobante al beneficiario.
-- Por ahora se usan dos conceptos (según la contadora):
--   055 · Servicios Personas Jurídicas Domiciliadas → 2% de la base (sin sustraendo)
--   002 · Actividades Profesionales No Mercantiles (PNR) → 3% de la base − sustraendo 107,50
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- Catálogo de conceptos ISLR (editable; el sustraendo depende de la UT vigente).
create table if not exists islr_conceptos (
  codigo     text primary key,
  nombre     text not null,
  porcentaje numeric not null,
  sustraendo numeric not null default 0,
  activo     boolean not null default true,
  orden      int
);
alter table islr_conceptos disable row level security;

insert into islr_conceptos (codigo, nombre, porcentaje, sustraendo, activo, orden) values
  ('055', 'SERVICIOS PERSONAS JURIDICAS DOMICILIADAS', 2, 0, true, 1),
  ('002', 'ACTIVIDADES PROFESIONALES NO MERCANTILES (PNR)', 3, 107.50, true, 2)
on conflict (codigo) do update set nombre = excluded.nombre, porcentaje = excluded.porcentaje, sustraendo = excluded.sustraendo;

-- Campos de retención de ISLR en el egreso
alter table egresos add column if not exists ret_islr_aplica       boolean not null default false;
alter table egresos add column if not exists ret_islr_codigo       text;      -- 055 | 002
alter table egresos add column if not exists ret_islr_concepto     text;      -- nombre del concepto
alter table egresos add column if not exists ret_islr_pct          numeric;   -- 2 | 3
alter table egresos add column if not exists ret_islr_sustraendo   numeric;   -- 0 | 107.50
alter table egresos add column if not exists ret_islr_base         numeric;   -- base imponible (sin IVA)
alter table egresos add column if not exists ret_islr_monto        numeric;   -- base*% - sustraendo
alter table egresos add column if not exists ret_islr_comprobante  text;      -- AAAA-MM-00000000
alter table egresos add column if not exists ret_islr_periodo      text;      -- AAAAMM
alter table egresos add column if not exists ret_islr_fecha_emision date;
