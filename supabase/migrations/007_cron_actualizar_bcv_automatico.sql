-- Actualización automática de la tasa BCV desde dolarapi (ve.dolarapi.com)
-- Programada con pg_cron a las 9:30 am y 2:30 pm hora Venezuela.
-- El USDT NO se toca: lo controla Rojas manualmente desde el panel de Tasas.

create extension if not exists http with schema extensions;

-- Log de auditoría de actualizaciones automáticas de tasas (sin datos sensibles)
create table if not exists public.config_tasas_log (
  id bigint generated always as identity primary key,
  clave text not null,
  valor_anterior numeric,
  valor_nuevo numeric not null,
  fuente text,
  creado_en timestamptz not null default now()
);

-- Función: trae el BCV oficial de dolarapi y actualiza tasa_bcv con validaciones.
create or replace function public.actualizar_bcv_automatico()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_content   text;
  v_bcv       numeric;
  v_anterior  numeric;
begin
  -- Timeout para no dejar el cron colgado si la fuente no responde
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');

  begin
    select (extensions.http_get('https://ve.dolarapi.com/v1/dolares')).content
      into v_content;
  exception when others then
    raise notice 'actualizar_bcv_automatico: error al consultar la fuente';
    return;
  end;

  if v_content is null then
    raise notice 'actualizar_bcv_automatico: sin respuesta de la fuente';
    return;
  end if;

  select (elem->>'promedio')::numeric
    into v_bcv
  from jsonb_array_elements(v_content::jsonb) elem
  where elem->>'fuente' = 'oficial'
  limit 1;

  -- Guardas de seguridad: debe ser un número positivo y razonable
  if v_bcv is null or v_bcv <= 0 or v_bcv > 1000000 then
    raise notice 'actualizar_bcv_automatico: valor BCV inválido (%)', v_bcv;
    return;
  end if;

  select valor into v_anterior from public.config_cotizaciones where clave = 'tasa_bcv';

  -- Si no cambió, no hacemos nada
  if v_anterior is not null and round(v_anterior, 4) = round(v_bcv, 4) then
    return;
  end if;

  update public.config_cotizaciones
     set valor = v_bcv, updated_at = now()
   where clave = 'tasa_bcv';

  if not found then
    insert into public.config_cotizaciones (clave, valor, updated_at)
    values ('tasa_bcv', v_bcv, now());
  end if;

  insert into public.config_tasas_log (clave, valor_anterior, valor_nuevo, fuente)
  values ('tasa_bcv', v_anterior, v_bcv, 'dolarapi_oficial');
end;
$$;

-- Programación (hora UTC). Venezuela = UTC-4, sin horario de verano:
--   13:30 UTC = 9:30 am VET   |   18:30 UTC = 2:30 pm VET
select cron.schedule('actualizar-bcv-manana', '30 13 * * *', $$select public.actualizar_bcv_automatico();$$);
select cron.schedule('actualizar-bcv-tarde',  '30 18 * * *', $$select public.actualizar_bcv_automatico();$$);
