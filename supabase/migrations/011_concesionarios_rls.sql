-- La tabla concesionarios se accede solo vía service role (rutas admin).
-- Habilitar RLS sin políticas bloquea el acceso directo con anon/authenticated.
alter table public.concesionarios enable row level security;
