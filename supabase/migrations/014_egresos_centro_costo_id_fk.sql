-- Fase 1 (Egresos/Finanzas) — FK del egreso al centro de costo
-- Espejo de la migración remota 20260714154032_egresos_centro_costo_id_fk
-- Se guarda centro_costo_id para el reporte por centro de costo; el nombre del
-- centro también se copia a area_responsable por compatibilidad.

alter table egresos
  add column if not exists centro_costo_id text references centros_costo(id);

create index if not exists idx_egresos_centro_costo on egresos(centro_costo_id);
