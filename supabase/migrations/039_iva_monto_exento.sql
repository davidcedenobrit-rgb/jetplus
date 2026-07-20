-- 039_iva_monto_exento.sql
-- Facturas mixtas: una parte gravada con IVA y otra parte EXENTA. Antes el
-- formulario solo permitía una alícuota para todo el monto, así que no se podía
-- reflejar el exento de una factura que también tiene renglones gravados.
--   monto (total) = base_imponible + iva_monto + monto_exento
-- El IVA se calcula solo sobre (total - exento). Campo aditivo y opcional
-- (default 0). Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.egresos  add column if not exists monto_exento numeric(14,2);
alter table public.ingresos add column if not exists monto_exento numeric(14,2);
