-- Extras — Ficha de empleado más completa (#38)
-- Campos adicionales de RRHH para la ficha del empleado.
-- (La tabla empleados se creó fuera de las migraciones del repo; esta sólo
--  agrega columnas nuevas de forma idempotente.)

alter table empleados add column if not exists fecha_nacimiento date;
alter table empleados add column if not exists direccion text;
alter table empleados add column if not exists salario numeric(14,2);
alter table empleados add column if not exists salario_moneda text;
alter table empleados add column if not exists salario_frecuencia text;
alter table empleados add column if not exists cuenta_banco text;
alter table empleados add column if not exists contacto_emergencia_nombre text;
alter table empleados add column if not exists contacto_emergencia_telefono text;
alter table empleados add column if not exists tipo_contrato text;
