-- Dirección del proveedor (para el catálogo de compra en plaza).
alter table proveedores add column if not exists direccion text;
