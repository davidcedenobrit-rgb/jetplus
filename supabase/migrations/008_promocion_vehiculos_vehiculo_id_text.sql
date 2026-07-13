-- catalogo_ventas.id es text (ej. "t90-4x4-gaso"), pero promocion_vehiculos.vehiculo_id
-- era uuid, lo que hacía fallar el "Agregar a la promoción" con:
--   invalid input syntax for type uuid: "t90-4x4-gaso"
-- Se cambia a text para que coincida con el id del catálogo.
alter table public.promocion_vehiculos
  alter column vehiculo_id type text using vehiculo_id::text;

notify pgrst, 'reload schema';
