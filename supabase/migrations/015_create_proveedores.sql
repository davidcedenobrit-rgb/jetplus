-- Fase 1 (Egresos/Finanzas) — Base de datos de proveedores
-- Espejo de la migración remota create_proveedores_egresos_proveedor_id
-- El beneficiario del egreso pasa a ser un proveedor buscable (nombre, RIF,
-- correo, teléfono, N° de cuenta) con creación en línea.

create table if not exists proveedores (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  rif           text,
  correo        text,
  telefono      text,
  numero_cuenta text,
  banco         text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Tabla de catálogo leída vía admin client (JWT de usuario). RLS deshabilitado,
-- consistente con concesionarios y centros_costo.
alter table proveedores disable row level security;

create index if not exists idx_proveedores_nombre on proveedores (lower(nombre));

alter table egresos add column if not exists proveedor_id uuid references proveedores(id);
create index if not exists idx_egresos_proveedor on egresos(proveedor_id);
