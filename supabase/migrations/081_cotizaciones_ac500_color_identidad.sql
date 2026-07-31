-- 081_cotizaciones_ac500_color_identidad.sql
-- Precompra (AC500) Fase 2: la cotización captura color elegido y la identidad
-- completa (cédula + RIF por separado) para que arrastre a la proforma y al anexo.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.cotizaciones
  add column if not exists color text,
  add column if not exists cliente_cedula text,
  add column if not exists cliente_rif text;
