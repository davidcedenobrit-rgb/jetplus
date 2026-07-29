-- Blindaje de seguridad: fija search_path = public en todas las funciones que
-- no lo tenían, para evitar ataques de secuestro de search_path
-- (advisor: function_search_path_mutable). Aplicado a ambas bases.
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (p.proconfig is null or not exists (
            select 1 from unnest(p.proconfig) c where c like 'search\_path=%'))
  loop
    execute format('alter function public.%I(%s) set search_path = public', r.proname, r.args);
  end loop;
end $$;
