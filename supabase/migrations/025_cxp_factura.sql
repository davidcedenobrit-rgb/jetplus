-- Cuentas por pagar: adjuntar la factura/soporte de la obligación
alter table public.cuentas_por_pagar add column if not exists factura_url text;
