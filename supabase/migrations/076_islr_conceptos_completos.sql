-- Conceptos de retención de ISLR que trabaja La Oriental (según la contadora).
-- La retención se aplica sobre la BASE IMPONIBLE de la prestación del servicio.
-- Los conceptos PNR/PND retienen solo por encima de Bs 3.583,33; eso lo cumple
-- el sustraendo (a ese monto base×% = sustraendo → retención 0).
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

insert into islr_conceptos (codigo, nombre, porcentaje, sustraendo, activo, orden) values
  ('004', 'HONORARIOS PROFESIONALES (PJD)',                     5, 0,      true, 1),
  ('002', 'HONORARIOS PROFESIONALES (PNR)',                     3, 107.50, true, 2),
  ('057', 'ARRENDAMIENTO BIENES INMUEBLES (PNR)',               3, 107.50, true, 3),
  ('059', 'ARRENDAMIENTO BIENES INMUEBLES (PJD)',               5, 0,      true, 4),
  ('071', 'FLETES Y GASTOS DE TRANSPORTE NACIONAL (PNR)',       1, 35.83,  true, 5),
  ('072', 'FLETES Y GASTOS DE TRANSPORTE NACIONAL (PJD)',       3, 0,      true, 6),
  ('083', 'PUBLICIDAD Y PROPAGANDA (PNR)',                      3, 107.50, true, 7),
  ('084', 'PUBLICIDAD Y PROPAGANDA (PJD)',                      5, 0,      true, 8),
  ('053', 'EJECUCION DE OBRAS Y PRESTACION DE SERVICIOS (PND)', 1, 35.83,  true, 9),
  ('055', 'EJECUCION DE OBRAS Y PRESTACION DE SERVICIOS (PJD)', 2, 0,      true, 10)
on conflict (codigo) do update set
  nombre = excluded.nombre, porcentaje = excluded.porcentaje,
  sustraendo = excluded.sustraendo, activo = excluded.activo, orden = excluded.orden;
