-- createAdminClient usa la service_role key como apikey pero envía el JWT del
-- usuario en Authorization, por lo que RLS aplica como el usuario. Sin políticas,
-- RLS bloqueaba las lecturas/escrituras de las rutas admin (el selector de
-- concesionario salía vacío y la generación caía siempre en La Oriental).
-- Los datos del concesionario son públicos (aparecen en el PDF), así que se
-- deshabilita RLS — consistente con config_cotizaciones y demás tablas de
-- configuración del sistema, cuyo acceso ya está protegido por rol en las rutas.
alter table public.concesionarios disable row level security;
