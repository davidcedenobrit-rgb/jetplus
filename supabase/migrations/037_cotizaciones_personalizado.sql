-- 037_cotizaciones_personalizado.sql
-- Modalidad de venta "Personalizado": un plan de crédito que Rojas arma al
-- momento de cotizar, con inicial, meses, tasa y diferencial libres (para casos
-- puntuales de negociación). Los parámetros se guardan en la cotización para
-- poder reproducir/editar/reactivar los montos. `plan` no tiene CHECK, así que
-- admite el valor 'personalizado' sin tocar constraints.
-- Campos aditivos y opcionales (solo se llenan en cotizaciones personalizadas).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table public.cotizaciones add column if not exists personalizado_inicial_pct numeric(5,2);
alter table public.cotizaciones add column if not exists personalizado_meses int;
alter table public.cotizaciones add column if not exists personalizado_tasa_pct numeric(5,2);
alter table public.cotizaciones add column if not exists personalizado_diferencial boolean not null default false;
