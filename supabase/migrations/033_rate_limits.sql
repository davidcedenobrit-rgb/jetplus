-- 033_rate_limits.sql
-- Rate limiting respaldado en la base (funciona en serverless / múltiples
-- instancias). Un contador por "clave" y ventana de tiempo (bucket). La función
-- devuelve true si la acción está permitida (dentro del límite).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

create table if not exists public.rate_limits (
  clave text primary key,
  bucket bigint not null,
  contador int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;

-- Devuelve true si se permite; false si se excedió el límite en la ventana.
create or replace function public.check_rate_limit(p_clave text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket bigint;
  v_contador int;
begin
  v_bucket := floor(extract(epoch from now()) / p_window_seconds)::bigint;
  insert into public.rate_limits (clave, bucket, contador, updated_at)
    values (p_clave, v_bucket, 1, now())
  on conflict (clave) do update set
    contador = case when public.rate_limits.bucket = v_bucket then public.rate_limits.contador + 1 else 1 end,
    bucket = v_bucket,
    updated_at = now()
  returning contador into v_contador;
  return v_contador <= p_max;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to service_role;
