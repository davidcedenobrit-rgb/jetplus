-- Carro que el cliente reserva con el anticipo (opcional). Snapshot con
-- marca/modelo/placa/color + la unidad del showroom si aplica. Sirve para
-- generar el Acuerdo de Reserva de Vehículo desde el módulo de Anticipos.
alter table public.anticipos
  add column if not exists reserva_vehiculo jsonb;
