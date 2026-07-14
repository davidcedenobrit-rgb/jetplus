-- Fase 1 (Egresos/Finanzas) — Centro de costo + Origen de capital + Gasto/Inversión
-- Espejo de la migración remota 20260714153435_egresos_centro_costo_origen

-- Catálogo de centros de costo (editable). RLS deshabilitado por ser tabla de
-- configuración pública, consistente con concesionarios (ver 012).
create table if not exists centros_costo (
  id      text primary key,
  nombre  text not null,
  activo  boolean not null default true,
  orden   integer
);

alter table centros_costo disable row level security;

insert into centros_costo (id, nombre, activo, orden) values
  ('administracion', 'Administración',    true, 1),
  ('ventas',         'Ventas',            true, 2),
  ('servicio',       'Servicios',         true, 3),
  ('repuestos',      'Repuestos',         true, 4),
  ('directiva',      'Directiva',         true, 5)
on conflict (id) do nothing;

-- Nuevos campos de clasificación del egreso
alter table egresos add column if not exists origen_capital  text;
alter table egresos add column if not exists tipo_movimiento text;
