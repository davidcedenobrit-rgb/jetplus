-- Vínculo de un ingreso ya registrado con la PROFORMA que lo origina.
-- Caso de uso: ventas que se registraron directo como Ingreso (sin pasar por el
-- flujo cotización → proforma → venta). Al convertir la cotización en proforma,
-- se "jalan" esos ingresos ya existentes para: (a) dejar la trazabilidad
-- (proforma/venta ↔ recibo) y (b) evitar duplicar el dinero al registrar la
-- venta (no se crean ingresos nuevos; los jalados cuentan como el inicial).
alter table public.ingresos
  add column if not exists proforma_id uuid references public.proformas(id) on delete set null;

create index if not exists idx_ingresos_proforma on public.ingresos(proforma_id);
