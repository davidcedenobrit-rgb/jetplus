-- Doble numeración de repuestos:
--  • numero_scr  → correlativo de la solicitud creada por almacén (José Manuel)
--  • numero (SORE) → se asigna cuando Arianna envía la cotización a Vehimotors
alter table solicitudes_repuestos add column if not exists numero_scr text;
create unique index if not exists solicitudes_repuestos_numero_scr_key
  on solicitudes_repuestos(numero_scr) where numero_scr is not null;

-- El SORE deja de generarse en la creación; puede ser null hasta enviar a VM
alter table solicitudes_repuestos alter column numero drop not null;

-- Marcar por ítem cuáles se compran en plaza (los que Vehimotors no tiene)
alter table repuestos_items add column if not exists comprar_plaza boolean not null default false;
