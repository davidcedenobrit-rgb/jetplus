-- 079_division_contable_tipo_venta_potes.sql
-- Rediseño de la división contable de ventas (solicitado por dirección):
--   1. Tipo de venta: contado / crédito Vehimotors / crédito banca nacional /
--      crédito financiadora interno.
--   2. Nuevo flujo de montos:
--        Monto base La Oriental = Precio de venta − Comisión de venta
--        Comisión del vendedor  = % del vendedor × Monto base La Oriental
--        Egresos de La Oriental = Comisión del vendedor
--        Ingreso al centro de costo = Comisión de venta (bruta) − Comisión del vendedor
--        Pote de directiva (reservado) = Monto base − Egreso directiva − pólizas/obsequio/alfombras
--   3. Reparto de la comisión del vendedor entre varios vendedores (cada uno con su %).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.ventas_division_contable
  add column if not exists tipo_venta text,
  add column if not exists vendedor_pct numeric not null default 0,       -- % total de venta del vendedor
  add column if not exists comision_vendedor numeric not null default 0,  -- % vendedor × monto base
  add column if not exists egreso_directiva numeric not null default 0,   -- egreso directo de la directiva
  add column if not exists vendedores_split jsonb,                        -- [{ nombre, pct }]
  add column if not exists ingreso_centro_costo numeric not null default 0, -- comisión bruta − comisión vendedor
  add column if not exists pote_directiva numeric not null default 0;      -- remanente reservado (oculto)
