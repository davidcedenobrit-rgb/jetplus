-- Reserva (asociación) de un anticipo a una proforma desde el módulo "Asociar
-- anticipo". No mueve saldo: es una señal de que el anticipo del cliente queda
-- vinculado a esa proforma. La conversión a ingreso y el descuento del inicial
-- ocurren al registrar la venta.
alter table public.anticipos
  add column if not exists proforma_id uuid references public.proformas(id) on delete set null;
create index if not exists idx_anticipos_proforma on public.anticipos(proforma_id);
