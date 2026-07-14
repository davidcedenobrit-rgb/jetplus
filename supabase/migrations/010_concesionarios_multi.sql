-- Multi-concesionario para cotizaciones: cada concesionario tiene su propia
-- identidad (encabezado del PDF) y su propia numeración por prefijo.

create table if not exists public.concesionarios (
  id           text primary key,
  nombre       text not null,
  rif          text,
  direccion    text,
  telefono     text,
  correo       text,
  logo_url     text,
  prefijo      text not null unique,
  es_principal boolean not null default false,
  activo       boolean not null default true,
  orden        integer not null default 0,
  secuencia    bigint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into public.concesionarios (id, nombre, rif, direccion, telefono, correo, prefijo, es_principal, activo, orden, secuencia)
values
  ('la-oriental', 'LA ORIENTAL AUTOMOTORS, C.A.', 'J-505692143',
   E'AV. UGARTE ALIRIO PELYO · CENTRO PROFESIONAL DAVID\nMATURÍN - MONAGAS - VENEZUELA',
   '0414-9989010', 'laorientalautomotorsc@gmail.com', 'ORI', true, true, 1, 18),
  ('autosurca', 'AUTOMOTORES ORIENTE SUR, C.A.', null,
   E'AV. INTERCOMUNAL TIGRE - TIGRITO LOCAL GALPÓN NRO S/N\nSECTOR AV INTERCOMUNAL - TIGRE TIGRITO\nGUANIPA - ANZOÁTEGUI - VENEZUELA - ZONA POSTAL 6054',
   null, null, 'AUT', false, true, 2, 0),
  ('capital-motors', 'CAPITAL MOTORS', null, null, null, null, 'CAP', false, false, 3, 0),
  ('kiauto', 'KI AUTO', null, null, null, null, 'KIA', false, false, 4, 0)
on conflict (id) do nothing;

alter table public.cotizaciones
  add column if not exists concesionario_id text not null default 'la-oriental';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cotizaciones_concesionario_id_fkey') then
    alter table public.cotizaciones
      add constraint cotizaciones_concesionario_id_fkey
      foreign key (concesionario_id) references public.concesionarios(id);
  end if;
end $$;

-- Numeración por concesionario: prefijo propio + contador propio
create or replace function public.set_cotizacion_numero()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_prefijo text;
  v_seq bigint;
begin
  if NEW.concesionario_id is null then
    NEW.concesionario_id := 'la-oriental';
  end if;

  update public.concesionarios
     set secuencia = secuencia + 1, updated_at = now()
   where id = NEW.concesionario_id
   returning prefijo, secuencia into v_prefijo, v_seq;

  if v_prefijo is null then
    update public.concesionarios
       set secuencia = secuencia + 1, updated_at = now()
     where id = 'la-oriental'
     returning prefijo, secuencia into v_prefijo, v_seq;
    NEW.concesionario_id := 'la-oriental';
  end if;

  NEW.numero_seq := v_seq;
  NEW.numero := v_prefijo || '-' || to_char(NOW() AT TIME ZONE 'America/Caracas', 'YYMMDD') || '-' || LPAD(v_seq::text, 4, '0');
  return NEW;
end;
$function$;

notify pgrst, 'reload schema';
