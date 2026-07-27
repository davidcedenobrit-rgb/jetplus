-- Sello (imagen) del concesionario, para estamparlo en cotizaciones y
-- proformas. La Oriental usa un archivo local; las demás sedes suben el suyo
-- desde el panel de concesionarios.
alter table concesionarios add column if not exists sello_url text;
