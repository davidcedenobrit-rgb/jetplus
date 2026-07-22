-- 046_almacen_destinatarios.sql
-- Destinatarios del correo "Enviar a almacén" (repuestos). Antes eran 2 fijos
-- en el código; ahora se guardan para que Rojas pueda agregar correos nuevos y
-- tildarlos/destildarlos en cada solicitud. Aplicar a AMBAS bases.

create table if not exists public.almacen_destinatarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.almacen_destinatarios (email, orden) values
  ('jrodriguez@saicve.com', 1),
  ('armando.eminca@gmail.com', 2)
on conflict (email) do nothing;
