-- Eventos — cronograma / calendario (#56)
-- Registro de eventos (fecha, hora, lugar, responsable, tipo, estado).

create table if not exists eventos_calendario (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descripcion    text,
  fecha          date not null,
  hora           text,
  lugar          text,
  responsable    text,
  tipo           text,
  estado         text not null default 'programado',
  notas          text,
  registrado_por uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- RLS con política por rol: sólo dirección puede leer/escribir eventos, incluso
-- si llaman a la API directamente (no basta el guard de página).
alter table eventos_calendario enable row level security;
drop policy if exists eventos_staff on eventos_calendario;
create policy eventos_staff on eventos_calendario
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','mary','leysdem'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'rol') in ('jose','admin','director','mary','leysdem'));

create index if not exists idx_eventos_cal_fecha on eventos_calendario(fecha);
