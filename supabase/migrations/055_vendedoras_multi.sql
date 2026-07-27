-- Fase 1: soportar una o varias vendedoras por cotización, y que la(s)
-- vendedora(s) viajen a la proforma. Se guarda un arreglo estructurado
-- [{ codigo, nombre }]; `vendedora_nombre` (texto) se mantiene para
-- compatibilidad (nombres unidos por coma).

alter table cotizaciones add column if not exists vendedoras jsonb;
alter table proformas   add column if not exists vendedoras jsonb;
