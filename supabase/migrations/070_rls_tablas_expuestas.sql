-- Seguridad (URGENTE): activar RLS en tablas que estaban públicas (accesibles
-- con la anon key). Alerta Supabase: rls_disabled_in_public.
-- Acceso solo a usuarios autenticados (staff); el service role (admin client)
-- pasa por encima de RLS, así que las rutas API no se ven afectadas. Se bloquea
-- por completo el acceso anónimo/público.
-- Aplicado a AMBAS bases (La Oriental y Ki Auto).

alter table public.acuerdos_cobro enable row level security;
drop policy if exists acuerdos_cobro_auth on public.acuerdos_cobro;
create policy acuerdos_cobro_auth on public.acuerdos_cobro for all to authenticated using (true) with check (true);
revoke all on public.acuerdos_cobro from anon;

alter table public.almacen_destinatarios enable row level security;
drop policy if exists almacen_destinatarios_auth on public.almacen_destinatarios;
create policy almacen_destinatarios_auth on public.almacen_destinatarios for all to authenticated using (true) with check (true);
revoke all on public.almacen_destinatarios from anon;

alter table public.bn_casos enable row level security;
drop policy if exists bn_casos_auth on public.bn_casos;
create policy bn_casos_auth on public.bn_casos for all to authenticated using (true) with check (true);
revoke all on public.bn_casos from anon;

alter table public.ventas_division_contable enable row level security;
drop policy if exists ventas_division_auth on public.ventas_division_contable;
create policy ventas_division_auth on public.ventas_division_contable for all to authenticated using (true) with check (true);
revoke all on public.ventas_division_contable from anon;
