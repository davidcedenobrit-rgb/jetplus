-- 080_division_contable_boveda_egresos.sql
-- Cuadro resumen de la división contable (dibujo de dirección), en 3 bloques:
--   A) Ingreso bruto oriental = Monto proforma oriental − Pagado a Vehimotors
--   B) A ORIENTAL → Ingreso neto venta (va a contabilidad):
--        Ingreso bruto venta (= comisión de venta) − comisión de cada vendedor − comisión directiva
--   C) A DIRECTIVA = Ingreso bruto oriental − Ingreso bruto venta
--        − pólizas (carro/vida) − obsequio − papel ahumado − alfombra − gasto administrativo
--        = Ingreso bóveda ("la bolsa", reservado)
-- Nuevos egresos: papel ahumado y gasto administrativo.
-- Reutiliza pote_directiva como Ingreso bóveda.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.ventas_division_contable
  add column if not exists papel_ahumado numeric not null default 0,
  add column if not exists gasto_administrativo numeric not null default 0,
  add column if not exists ingreso_neto_venta numeric not null default 0;
