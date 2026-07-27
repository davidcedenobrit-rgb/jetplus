-- Dirección del beneficiario (proveedor) en el egreso, para incluirla en el
-- comprobante de retención de IVA. Si queda vacía, el comprobante cae en la
-- dirección registrada del proveedor.
alter table egresos
  add column if not exists beneficiario_direccion text;
