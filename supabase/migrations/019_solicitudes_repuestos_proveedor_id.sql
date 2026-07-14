-- Repuestos — vincular la compra en plaza a la base de proveedores (#23)
-- El proveedor de una compra en plaza deja de ser texto libre y se enlaza a la
-- tabla `proveedores` (creada en 015). El texto `proveedor_plaza` se conserva.

alter table solicitudes_repuestos add column if not exists proveedor_id uuid references proveedores(id);
