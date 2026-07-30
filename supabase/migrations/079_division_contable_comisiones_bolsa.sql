-- 079_division_contable_comisiones_bolsa.sql
-- Rediseño de la división contable de ventas (modelo definitivo de dirección):
--   Precio de venta                                  (se arrastra de la venta)
--   % Comisión de venta  →  Monto comisión de venta = precio × %
--   Monto base de La Oriental = precio − monto comisión de venta
--   % Comisión de vendedores → Monto = base × %   (pool que se reparte 100% entre los vendedores)
--   % Comisión de directiva  → Monto = base × %
--   Egresos de La Oriental (van a contabilidad):
--       comisión de cada vendedor + comisión directiva + pólizas + obsequio + alfombras
--   Neto de directiva ("la bolsa") = base − egresos de La Oriental   (reservado, oculto)
-- Reutiliza comision_pct (% comisión de venta) y comision_monto (monto comisión de venta).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.ventas_division_contable
  add column if not exists tipo_venta text,
  add column if not exists comision_vendedores_pct numeric not null default 0,
  add column if not exists comision_vendedores_monto numeric not null default 0,
  add column if not exists comision_directiva_pct numeric not null default 0,
  add column if not exists comision_directiva_monto numeric not null default 0,
  add column if not exists vendedores_split jsonb,                       -- [{ nombre, pct }] (% del pool)
  add column if not exists pote_directiva numeric not null default 0;    -- neto de directiva ("la bolsa"), reservado
