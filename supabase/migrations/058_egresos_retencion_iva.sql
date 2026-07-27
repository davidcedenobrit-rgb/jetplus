-- Retención de IVA en egresos. Cuando un egreso tiene factura de un proveedor,
-- La Oriental (agente de retención) retiene el 75% o 100% del IVA y le emite un
-- comprobante de retención. Los campos de factura son obligatorios (a nivel de
-- app) cuando aplica retención / va al libro de compra; si es nota de entrega
-- quedan opcionales.

alter table egresos add column if not exists tipo_soporte text;            -- 'factura' | 'nota_entrega' | null
alter table egresos add column if not exists fecha_factura date;
alter table egresos add column if not exists numero_factura text;
alter table egresos add column if not exists numero_control text;

-- Retención de IVA
alter table egresos add column if not exists ret_iva_aplica boolean not null default false;
alter table egresos add column if not exists ret_iva_pct numeric;           -- 75 | 100
alter table egresos add column if not exists ret_iva_monto numeric;         -- iva_monto * pct/100
alter table egresos add column if not exists ret_iva_comprobante text;      -- AAAAMM + secuencial
alter table egresos add column if not exists ret_iva_periodo text;          -- AAAAMM
alter table egresos add column if not exists ret_iva_fecha_emision date;    -- editable
alter table egresos add column if not exists ret_iva_email_enviado_at timestamptz;
