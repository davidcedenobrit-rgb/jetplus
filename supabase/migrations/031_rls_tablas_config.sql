-- 031_rls_tablas_config.sql
-- Seguridad: habilitar Row Level Security en 10 tablas que estaban expuestas a
-- la llave pública (anon). Auditoría: ninguna página pública/anónima lee estas
-- tablas — se acceden por service_role (createAdminClient, ignora RLS) o por
-- sesión autenticada (dashboard). Por eso una política `to authenticated`
-- preserva el comportamiento actual y solo cierra el acceso anónimo.
--
-- concesionarios: se deja LECTURA pública (es branding: nombre, RIF, logo que
-- aparece en cotizaciones/documentos) y ESCRITURA solo autenticada.
--
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- ── Tablas de datos internos: solo autenticados (bloquea anon por completo) ──
do $$
declare t text;
begin
  foreach t in array array[
    'cuentas','centros_costo','proveedores','pagos_fijos','prestamos_empleados',
    'prestamos_abonos','materiales_insumos','obsequios_clientes','config_tasas_log'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_auth_all', t);
    execute format('create policy %I on public.%I as permissive for all to authenticated using (true) with check (true);', t||'_auth_all', t);
    execute format('revoke all on public.%I from anon;', t);
    execute format('grant all on public.%I to authenticated, service_role;', t);
  end loop;
end $$;

-- ── concesionarios: lectura pública (branding), escritura autenticada ──
alter table public.concesionarios enable row level security;
drop policy if exists concesionarios_public_read on public.concesionarios;
drop policy if exists concesionarios_auth_write on public.concesionarios;
create policy concesionarios_public_read on public.concesionarios
  as permissive for select using (true);
create policy concesionarios_auth_write on public.concesionarios
  as permissive for all to authenticated using (true) with check (true);
revoke all on public.concesionarios from anon;
grant select on public.concesionarios to anon;
grant all on public.concesionarios to authenticated, service_role;
