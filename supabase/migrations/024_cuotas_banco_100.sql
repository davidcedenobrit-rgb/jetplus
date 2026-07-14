-- Plan 100% Banco — cantidad de meses editable (antes fijo en 24)
-- cuotas_banco en el catálogo (configuración por vehículo) y en la cotización
-- (el plazo con el que se generó, para que el PDF muestre el número correcto).

alter table catalogo_ventas add column if not exists cuotas_banco integer default 24;
alter table cotizaciones add column if not exists cuotas_banco integer;
