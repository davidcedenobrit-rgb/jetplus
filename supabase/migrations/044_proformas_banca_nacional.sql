-- 044_proformas_banca_nacional.sql
-- Modalidad "Banca nacional": el banco aprueba una parte del precio y el cliente
-- cubre el resto (de contado o con acuerdo de pago). Al convertir la cotización
-- en proforma se guarda ese reparto.
--   banca_nacional = {
--     aprobado_banco: number,   -- monto que financia el banco
--     restante: number,         -- lo que pone el cliente (total − aprobado)
--     restante_metodo: 'contado' | 'acuerdo',
--     banco: string | null      -- se llena al registrar el ingreso
--   }
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.proformas add column if not exists banca_nacional jsonb;
