-- 088_concesionario_branding_ventas.sql
-- Branding del link público de ventas por concesionario: nombre comercial,
-- ciudad y estado (para que /ventas muestre la marca de cada base — Ki Auto
-- en Puerto Ordaz, La Oriental en Maturín, etc.).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.concesionarios
  add column if not exists nombre_comercial text,
  add column if not exists ciudad text,
  add column if not exists estado text;
