-- División contable — nueva fórmula:
--   Ingreso bruto La Oriental = Monto proforma − Pago a Vehimotors
--   A directiva = Ingreso bruto − Comisión de venta
--   Remanente directiva = A directiva − (póliza carro + póliza vida + obsequio + alfombras)
alter table ventas_division_contable add column if not exists monto_proforma numeric not null default 0;
alter table ventas_division_contable add column if not exists poliza_carro numeric not null default 0;
alter table ventas_division_contable add column if not exists poliza_vida numeric not null default 0;
alter table ventas_division_contable add column if not exists obsequio_clientes numeric not null default 0;
alter table ventas_division_contable add column if not exists alfombras numeric not null default 0;
