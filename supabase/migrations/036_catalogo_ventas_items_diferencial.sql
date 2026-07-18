-- 036_catalogo_ventas_items_diferencial.sql
-- Estructura de costos por modalidad más completa y flexible.
--   1. Diferencial cambiario disponible en las 3 modalidades (Contado, Crédito
--      Vehimotors y Plan 100% Banco). Rojas decide por caso si lo activa con un
--      interruptor; el % sigue saliendo de las tasas globales BCV/USDT.
--   2. Nuevos ítems de gasto en las 3 modalidades: transporte, accesorios e IGTF
--      (alfombras ya existía). Son montos ($) manuales, se suman al total de
--      gastos de su modalidad.
-- Todos los campos son aditivos y opcionales: los vehículos existentes no
-- cambian de precio. El interruptor de Banco arranca ACTIVADO para preservar el
-- comportamiento actual (el plan banco siempre aplicaba el diferencial).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- Ítems nuevos — Contado
alter table public.catalogo_ventas add column if not exists transporte_c numeric(14,2);
alter table public.catalogo_ventas add column if not exists accesorios_c numeric(14,2);
alter table public.catalogo_ventas add column if not exists igtf_c numeric(14,2);

-- Ítems nuevos — Crédito Vehimotors
alter table public.catalogo_ventas add column if not exists transporte_cr numeric(14,2);
alter table public.catalogo_ventas add column if not exists accesorios_cr numeric(14,2);
alter table public.catalogo_ventas add column if not exists igtf_cr numeric(14,2);

-- Ítems nuevos — Plan 100% Banco
alter table public.catalogo_ventas add column if not exists transporte_banco numeric(14,2);
alter table public.catalogo_ventas add column if not exists accesorios_banco numeric(14,2);
alter table public.catalogo_ventas add column if not exists igtf_banco numeric(14,2);

-- Interruptores del diferencial cambiario por modalidad
alter table public.catalogo_ventas add column if not exists diferencial_c_activo boolean not null default false;
alter table public.catalogo_ventas add column if not exists diferencial_cr_activo boolean not null default false;
alter table public.catalogo_ventas add column if not exists diferencial_banco_activo boolean not null default true;
