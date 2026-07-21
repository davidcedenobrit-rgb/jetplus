-- 042_repuestos_estado_sin_stock.sql
-- BUG: el estado 'sin_stock' (Vehimotors no tiene → comprar en plaza) nunca
-- estuvo en el CHECK de solicitudes_repuestos.estado, aunque TODO el código de
-- la app lo usa (agrupación, pestaña "Sin stock", compra en plaza). Resultado:
-- cuando Vehimotors respondía "no hay", el UPDATE a estado='sin_stock' violaba
-- el CHECK y fallaba en silencio; la solicitud se quedaba en 'cotizacion_enviada'
-- y nunca aparecía en la carta de "Sin stock".
--
-- Se agrega 'sin_stock' al CHECK y se recuperan las solicitudes atascadas
-- (las que tienen evento de historial 'sin_stock' pero siguen en otro estado).
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

alter table public.solicitudes_repuestos drop constraint if exists solicitudes_repuestos_estado_check;
alter table public.solicitudes_repuestos add constraint solicitudes_repuestos_estado_check
  check (estado = any (array[
    'solicitado', 'verificado', 'cotizacion_enviada', 'cotizacion_recibida',
    'sin_stock', 'cotizacion_aprobada', 'factura_recibida', 'pago_enviado',
    'enviado_almacen', 'guia_recibida', 'completado',
    'rechazado_verificacion', 'cancelado', 'comprado_plaza'
  ]));

-- Recuperar solicitudes que Vehimotors marcó "sin stock" pero quedaron atascadas.
update public.solicitudes_repuestos s
set estado = 'sin_stock',
    respuesta_vehimotors = coalesce(respuesta_vehimotors, 'no_hay'),
    updated_at = now()
where s.estado <> 'sin_stock'
  and exists (
    select 1 from public.repuestos_historial h
    where h.solicitud_id = s.id and h.estado_nuevo = 'sin_stock'
  );
