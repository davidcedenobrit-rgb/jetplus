-- Retención de IVA en la cotización. Cuando el cliente es agente de retención,
-- retiene un % del IVA al facturar (75, 95 o 100 típicamente). Rojas define el %
-- a su criterio. Es informativo: el total de la cotización queda completo y se
-- muestra aparte cuánto retiene y cuánto pagaría el cliente con la retención.
alter table cotizaciones
  add column if not exists retencion_pct numeric;  -- % de IVA retenido, ej: 75
