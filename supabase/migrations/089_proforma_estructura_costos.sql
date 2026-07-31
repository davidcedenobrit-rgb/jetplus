-- 089_proforma_estructura_costos.sql
-- Ventas Fase 1: arrastrar la PROPUESTA DE PAGO completa (desglose/estructura
-- de costos negociada por el director) desde la cotización a la proforma, para
-- que las decisiones viajen estructuradas hasta la venta (no solo el texto).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.proformas
  add column if not exists estructura_costos jsonb;
