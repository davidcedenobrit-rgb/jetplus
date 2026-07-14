-- Auto-mora: marca automáticamente las cuotas vencidas cada día.
-- Formaliza (idempotente) el job de pg_cron que ya existía en la base para que
-- el proceso sea reproducible desde el repo.
-- Una cuota 'pendiente' cuya fecha de vencimiento ya pasó queda 'vencida', que
-- es como el sistema identifica a los clientes en mora.

create extension if not exists pg_cron;

-- Reprograma el job diario (evita duplicados si ya existe)
select cron.unschedule('marcar-cuotas-vencidas-diario')
where exists (select 1 from cron.job where jobname = 'marcar-cuotas-vencidas-diario');

select cron.schedule(
  'marcar-cuotas-vencidas-diario',
  '0 4 * * *',  -- 04:00 UTC ≈ medianoche Venezuela (UTC-4)
  $$UPDATE cuotas SET estado = 'vencida' WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE$$
);

-- Deja el estado al día de inmediato
UPDATE cuotas SET estado = 'vencida' WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE;
