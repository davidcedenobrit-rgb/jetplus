-- BN Vehimotors: banco que aprobó, correo al que se envió el expediente a
-- Vehimotors, marca de envío y la proforma generada.
alter table bn_casos add column if not exists banco text;
alter table bn_casos add column if not exists vehimotors_email text;
alter table bn_casos add column if not exists enviado_vm_at timestamptz;
alter table bn_casos add column if not exists proforma_id uuid;
