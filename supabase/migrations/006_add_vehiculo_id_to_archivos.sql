-- Permite asociar archivos directamente a vehículos (documentos del vehículo)
alter table archivos
  add column if not exists vehiculo_id uuid references vehiculos(id) on delete cascade;

create index if not exists idx_archivos_vehiculo on archivos(vehiculo_id);
