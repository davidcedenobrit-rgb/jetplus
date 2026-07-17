-- 032_categorias_egreso_config.sql
-- Categorías de egreso configurables (renombrar, activar/desactivar, ordenar)
-- sin tocar el enum categoria_egreso ni la columna egresos.categoria. La clave
-- coincide con el valor del enum; el formulario muestra solo las activas.
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

create table if not exists public.categorias_egreso (
  clave text primary key,
  nombre text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categorias_egreso (clave, nombre, orden) values
  ('gastos_administrativos','Gastos administrativos',1),
  ('proveedores','Proveedores',2),
  ('tramites_vehiculares','Trámites vehiculares',3),
  ('impuestos','Impuestos',4),
  ('seguro','Seguro',5),
  ('logistica','Logística',6),
  ('mantenimiento','Mantenimiento',7),
  ('comisiones','Comisiones',8),
  ('servicios','Servicios',9),
  ('vehimotors','Vehimotors',10),
  ('bancos_comisiones','Bancos / Comisiones',11),
  ('otros','Otros',12),
  ('taller','Taller',13),
  ('repuestos','Repuestos',14),
  ('alquiler','Alquiler',15),
  ('costos_ventas','Costos de Ventas',16),
  ('costos_servicios','Costos de Prestación de Servicios',17),
  ('sueldos_beneficios','Sueldos, Bonos y Beneficios Laborales',18),
  ('representacion_viaticos','Representación, Viáticos y Logística',19),
  ('servicios_profesionales','Servicios Profesionales y Asesorías',20),
  ('instalaciones_servicios','Instalaciones y Servicios',21),
  ('articulos_suministros','Artículos, Suministros y Materiales',22),
  ('vehiculos_propios','Vehículos Propios',23),
  ('seguros_impuestos','Seguros, Patrocinios e Impuestos',24),
  ('gastos_financieros','Gastos Financieros, Multas y Otros',25),
  ('cuentas_cobrar','Cuentas por Cobrar',26),
  ('cuentas_pagar','Cuentas por Pagar',27),
  ('resultados_reservas','Resultados, Apartados y Reservas',28),
  ('cr_avanza_motors','CR Avanza Motors',29),
  ('cr_plaza','CR Plaza',30),
  ('costos_repuestos','Costos de Repuestos',31)
on conflict (clave) do nothing;

-- RLS: consistente con las demás tablas de config (lectura/escritura autenticada)
alter table public.categorias_egreso enable row level security;
drop policy if exists categorias_egreso_auth_all on public.categorias_egreso;
create policy categorias_egreso_auth_all on public.categorias_egreso
  as permissive for all to authenticated using (true) with check (true);
revoke all on public.categorias_egreso from anon;
grant all on public.categorias_egreso to authenticated, service_role;
