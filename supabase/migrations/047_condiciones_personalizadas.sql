-- Propuesta de condiciones de pago personalizada.
-- Rojas puede escribir una condición de venta libre en la cotización; si el
-- cliente la acepta, esa condición pasa a ser la modalidad de la proforma.
alter table cotizaciones add column if not exists condiciones_personalizadas text;
alter table proformas add column if not exists condiciones_personalizadas text;
