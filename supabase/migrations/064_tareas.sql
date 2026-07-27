-- Tareas — listado de tareas y asignación de tareas al personal.
-- Rojas / dirección asignan tareas a cualquier usuario; cada quien ve "Mis tareas"
-- y puede actualizar el estado de las suyas.

create table if not exists tareas (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text,
  asignado_a    uuid references usuarios(id) on delete set null,
  creado_por    uuid references usuarios(id) on delete set null,
  prioridad     text not null default 'media',      -- baja | media | alta
  estado        text not null default 'pendiente',  -- pendiente | en_curso | hecha
  fecha_limite  date,
  completado_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tareas_asignado on tareas(asignado_a);
create index if not exists idx_tareas_estado   on tareas(estado);
create index if not exists idx_tareas_creado_por on tareas(creado_por);

alter table tareas enable row level security;

-- Roles que pueden asignar/crear/eliminar tareas (dirección).
-- Cada usuario ve y actualiza las tareas asignadas a él o creadas por él.

drop policy if exists tareas_select on tareas;
create policy tareas_select on tareas
  for select to authenticated
  using (
    asignado_a = auth.uid()
    or creado_por = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','carla')
  );

drop policy if exists tareas_insert on tareas;
create policy tareas_insert on tareas
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','carla'));

-- Actualiza: dirección todo; el asignado puede actualizar (cambiar estado) su tarea.
drop policy if exists tareas_update on tareas;
create policy tareas_update on tareas
  for update to authenticated
  using (
    asignado_a = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','carla')
  )
  with check (
    asignado_a = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','carla')
  );

drop policy if exists tareas_delete on tareas;
create policy tareas_delete on tareas
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','carla'));
