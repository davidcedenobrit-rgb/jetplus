-- Expediente del cliente (documentos) para enviar a Vehimotors.
alter table bn_casos add column if not exists expediente jsonb;
