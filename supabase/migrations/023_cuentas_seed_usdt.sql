-- Cuentas USDT adicionales por custodio (la cuenta del movimiento se deriva del método)
insert into cuentas (nombre, tipo, moneda, custodio, orden)
select v.nombre, v.tipo, v.moneda, v.custodio, v.orden
from (values
  ('USDT JR', 'usdt', 'USDT', 'JR', 4),
  ('Binance USDT', 'usdt', 'USDT', 'La Oriental', 5)
) as v(nombre, tipo, moneda, custodio, orden)
where not exists (select 1 from cuentas c where lower(c.nombre) = lower(v.nombre));
