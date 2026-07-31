-- 083_precompra_firma_envio.sql
-- Precompra (AC500) Fase 5: firma digital del cliente en el Anexo A y envío del
-- Anexo por correo a Vehimotors (destinatario abierto).
-- Aplicar a AMBAS bases.

alter table public.precompra_proformas
  add column if not exists correo_destino text,
  add column if not exists firma_cliente text,          -- URL de la firma digital (PNG)
  add column if not exists firma_cliente_at timestamptz,
  add column if not exists enviado_a text,
  add column if not exists enviado_at timestamptz;
