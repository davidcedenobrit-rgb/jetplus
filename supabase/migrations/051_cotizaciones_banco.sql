-- Banco asociado a la cotización (Banca Nacional): para estadísticas de qué
-- banco solicitan más y cuál aprueba más créditos.
alter table cotizaciones add column if not exists banco text;
