-- 086_precompra_vendedor.sql
-- Precompra (AC500): registrar el vendedor de la proforma (para calcular luego
-- la comisión del vendedor y el ingreso neto de venta).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.precompra_proformas
  add column if not exists vendedor_id uuid,
  add column if not exists vendedor_nombre text;
