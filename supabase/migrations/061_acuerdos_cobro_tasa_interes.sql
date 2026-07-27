-- Acuerdo de gestión de cobro: tasa de interés anual (%) que Rojas define a su
-- gusto sobre el monto financiado de la inicial. Si es 0 o nulo, las cuotas se
-- reparten parejo (sin interés). Si trae valor, la cuota se calcula por
-- amortización francesa, igual que el resto del sistema (cotizacion-calc).
alter table acuerdos_cobro
  add column if not exists tasa_interes numeric;  -- % anual, ej: 18
