-- Centro de costo "Vehimotors" para las cuotas de crédito que NO son de La
-- Oriental (solo se reportan a Vehimotors). Se marca como no-propio para que
-- los reportes de ingreso propio / balance lo excluyan.

alter table centros_costo add column if not exists es_propio boolean not null default true;

insert into centros_costo (id, nombre, activo, orden, es_propio)
values ('vehimotors', 'Vehimotors (fondos de terceros)', true, 6, false)
on conflict (id) do update set nombre = excluded.nombre, es_propio = excluded.es_propio;
