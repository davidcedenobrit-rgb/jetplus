-- Fase 2 (ajuste según contadora): los gastos comunes son los gastos fijos
-- (alquiler, luz, agua, internet, vigilancia, nómina). Al pagarse se reparten
-- por % entre las líneas de ingreso (Ventas comisiones / servicio / repuestos).
-- No existe un centro "Administración" ni "Directiva": un egreso marcado como
-- común se reparte; los de directiva se asignan a la línea según el motivo.
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

-- Marca de gasto común en el egreso. Los egresos generados desde Pago Fijo se
-- crean con es_comun = true; también puede marcarse a mano al registrar.
alter table egresos add column if not exists es_comun boolean not null default false;

-- Administración y Directiva dejan de ser centros seleccionables.
update centros_costo set activo = false where id in ('administracion', 'directiva');
