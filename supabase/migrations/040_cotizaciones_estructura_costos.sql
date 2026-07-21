-- 040_cotizaciones_estructura_costos.sql
-- Guarda la estructura de costos DESGLOSADA de la cotización (cada renglón:
-- placa, pólizas, honorarios, gastos internos, alfombras, transporte, accesorios,
-- IGTF, diferencial, inicial %, tasa, cuotas). Sirve para el panel "Aplicar
-- descuento" (Rojas edita renglón por renglón y recalcula en vivo) y para que la
-- proforma y la venta hereden la estructura negociada sin volver a escribirla.
-- Campo aditivo y opcional (las cotizaciones existentes siguen con su total de
-- gastos). Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.cotizaciones add column if not exists estructura_costos jsonb;
