-- Repuestos — auto-egreso al pagar la factura de Vehimotors (#22)
-- Cuando Mary carga el pago escribe el monto; con eso se registra un egreso y
-- se enlaza a la solicitud para trazabilidad.
-- (Las tablas de repuestos se crearon fuera de las migraciones del repo; esta
--  sólo agrega las columnas nuevas de forma idempotente.)

alter table solicitudes_repuestos add column if not exists egreso_pago_id uuid references egresos(id);
alter table solicitudes_repuestos add column if not exists monto_pago numeric(14,2);
alter table solicitudes_repuestos add column if not exists moneda_pago text;
