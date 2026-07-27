-- Permisos gubernamentales en Documentación de Empresa: fecha de pago/renovación
-- y control de recordatorios (7 y 3 días antes) enviados a Rojas, Mary y Leysdem.
alter table archivos add column if not exists fecha_pago date;
alter table archivos add column if not exists alerta_pago_7d_at timestamptz;
alter table archivos add column if not exists alerta_pago_3d_at timestamptz;
