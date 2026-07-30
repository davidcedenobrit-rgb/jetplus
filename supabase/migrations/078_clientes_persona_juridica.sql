-- Cliente persona jurídica (empresa): para que la letra de cambio lo describa
-- como "la Sociedad Mercantil …, inscrita por ante el Registro Mercantil …,
-- RIF J-…" en lugar de "venezolano(a), cédula V-…".
-- Aplicar a AMBAS bases (La Oriental y Ki Auto).

alter table clientes add column if not exists es_juridica boolean not null default false;
-- Texto del registro mercantil (verbatim, según el documento del cliente), p. ej.:
-- "inscrita por ante el Registro Mercantil de la Circunscripción Judicial del
--  Estado Monagas, en fecha cuatro (04) de julio de 2.024, bajo el Nº 24, Tomo 34-A, RM MAT"
alter table clientes add column if not exists identificacion_juridica text;
