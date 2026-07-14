-- Showroom — datos de la venta para la etiqueta de venta (#31)
-- Quién vendió (vendedora interna / directiva) y la fecha de la venta.

alter table vehiculos_showroom add column if not exists vendedora_venta text;
alter table vehiculos_showroom add column if not exists fecha_venta date;
