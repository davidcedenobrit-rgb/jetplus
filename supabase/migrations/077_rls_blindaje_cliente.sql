-- Blindaje RLS: evitar que una cuenta con rol `cliente` pueda leer/editar datos
-- de TODOS. Las políticas amplias (authenticated → true) se restringen a sesiones
-- de staff con es_sesion_staff(); se mantienen las políticas cliente_ve_sus_* y
-- los INSERT/DELETE. No afecta al staff (rol ≠ cliente) ni al service role.
-- Espejo del fix ya aplicado en La Oriental. Idempotente (safe en ambas bases).

create or replace function public.es_sesion_staff()
returns boolean language sql stable set search_path to '' as $$
  select auth.role() = 'authenticated'
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'rol'), '') <> 'cliente'
$$;

-- clientes
drop policy if exists clientes_select on public.clientes;
drop policy if exists autenticados_leen_clientes on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_staff_select on public.clientes;
drop policy if exists clientes_staff_update on public.clientes;
create policy clientes_staff_select on public.clientes for select to authenticated using (es_sesion_staff());
create policy clientes_staff_update on public.clientes for update to authenticated using (es_sesion_staff());

-- creditos
drop policy if exists creditos_select on public.creditos;
drop policy if exists autenticados_leen_creditos on public.creditos;
drop policy if exists creditos_update on public.creditos;
drop policy if exists creditos_staff_select on public.creditos;
drop policy if exists creditos_staff_update on public.creditos;
create policy creditos_staff_select on public.creditos for select to authenticated using (es_sesion_staff());
create policy creditos_staff_update on public.creditos for update to authenticated using (es_sesion_staff());

-- cuotas
drop policy if exists cuotas_select on public.cuotas;
drop policy if exists autenticados_leen_cuotas on public.cuotas;
drop policy if exists cuotas_update on public.cuotas;
drop policy if exists cuotas_staff_select on public.cuotas;
drop policy if exists cuotas_staff_update on public.cuotas;
create policy cuotas_staff_select on public.cuotas for select to authenticated using (es_sesion_staff());
create policy cuotas_staff_update on public.cuotas for update to authenticated using (es_sesion_staff());

-- ingresos
drop policy if exists ingresos_select on public.ingresos;
drop policy if exists autenticados_leen_ingresos on public.ingresos;
drop policy if exists ingresos_update on public.ingresos;
drop policy if exists ingresos_staff_select on public.ingresos;
drop policy if exists ingresos_staff_update on public.ingresos;
create policy ingresos_staff_select on public.ingresos for select to authenticated using (es_sesion_staff());
create policy ingresos_staff_update on public.ingresos for update to authenticated using (es_sesion_staff());

-- egresos
drop policy if exists egresos_select on public.egresos;
drop policy if exists autenticados_leen_egresos on public.egresos;
drop policy if exists egresos_update on public.egresos;
drop policy if exists egresos_staff_select on public.egresos;
drop policy if exists egresos_staff_update on public.egresos;
create policy egresos_staff_select on public.egresos for select to authenticated using (es_sesion_staff());
create policy egresos_staff_update on public.egresos for update to authenticated using (es_sesion_staff());

-- vehiculos
drop policy if exists vehiculos_select on public.vehiculos;
drop policy if exists autenticados_leen_vehiculos on public.vehiculos;
drop policy if exists vehiculos_update on public.vehiculos;
drop policy if exists vehiculos_staff_select on public.vehiculos;
drop policy if exists vehiculos_staff_update on public.vehiculos;
create policy vehiculos_staff_select on public.vehiculos for select to authenticated using (es_sesion_staff());
create policy vehiculos_staff_update on public.vehiculos for update to authenticated using (es_sesion_staff());

-- cotizaciones
drop policy if exists auth_all_cotizaciones on public.cotizaciones;
drop policy if exists cotizaciones_staff_all on public.cotizaciones;
create policy cotizaciones_staff_all on public.cotizaciones for all to authenticated using (es_sesion_staff()) with check (es_sesion_staff());

-- servicios_vehiculo
drop policy if exists auth_write_servicios_vehiculo on public.servicios_vehiculo;
drop policy if exists auth_read_servicios_vehiculo on public.servicios_vehiculo;
drop policy if exists servicios_vehiculo_staff_all on public.servicios_vehiculo;
drop policy if exists cliente_ve_sus_servicios on public.servicios_vehiculo;
create policy servicios_vehiculo_staff_all on public.servicios_vehiculo for all to authenticated using (es_sesion_staff()) with check (es_sesion_staff());
create policy cliente_ve_sus_servicios on public.servicios_vehiculo for select using (
  vehiculo_id in (select v.id from public.vehiculos v
    where v.cliente_id = (select cc.cliente_id from public.cliente_cuentas cc where cc.user_id = auth.uid() and cc.activo)));

-- usuarios
drop policy if exists autenticados_leen_usuarios on public.usuarios;
drop policy if exists usuarios_staff_select on public.usuarios;
create policy usuarios_staff_select on public.usuarios for select to authenticated using (es_sesion_staff());
