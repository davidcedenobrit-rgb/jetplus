-- Repuestos — precio de Vehimotors en el catálogo (#24)
-- Permite guardar el precio de referencia de Vehimotors por repuesto.

alter table catalogo_repuestos add column if not exists precio_vehimotors numeric(14,2);
