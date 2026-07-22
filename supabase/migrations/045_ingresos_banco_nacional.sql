-- 045_ingresos_banco_nacional.sql
-- En ventas por "Banca nacional", al registrar el ingreso se guarda de qué banco
-- nacional proviene el dinero aprobado. Solo aplica a esas ventas.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.ingresos add column if not exists banco_nacional text;
