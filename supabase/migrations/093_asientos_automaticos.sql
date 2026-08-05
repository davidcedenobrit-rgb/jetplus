-- Asientos automáticos (partida doble) desde ingresos y egresos.
-- Cada movimiento con cuenta contable genera un asiento BORRADOR/CUADRADO
-- (debe = haber) que la contadora revisa antes de contabilizar.
-- Los montos se expresan en USD (equivalente) para un mayor homogéneo.
--
-- Reglas MVP (documentadas para Neyda):
--  · Egreso  → Debe: cuenta del gasto/costo (base) + Debe: IVA crédito fiscal;
--              Haber: cuenta de tesorería de donde salió el dinero.
--  · Ingreso → Debe: cuenta de tesorería que recibió; Haber: cuenta de ingreso
--              (base) + Haber: IVA débito fiscal.
--  · La retención (IVA/ISLR) no se desglosa aún en el asiento automático.
--  · La contrapartida de tesorería se resuelve por método/banco (ver función).

-- Contrapartida de tesorería: a qué cuenta del plan pertenece el dinero.
create or replace function public.resolver_cuenta_tesoreria(p_moneda text, p_metodo text, p_banco text)
returns text language sql immutable as $$
  select case
    when coalesce(p_metodo,'') ilike '%efectivo%' or coalesce(p_metodo,'') ilike '%caja%'
      then case when p_moneda = 'VES' then '1.1.01.001' else '1.1.01.002' end
    when coalesce(p_banco,'') ilike '%banesco%'   then '1.1.02.003'
    when coalesce(p_banco,'') ilike '%bancamiga%' then '1.1.02.001'
    when coalesce(p_banco,'') ilike '%del sur%'   then '1.1.02.002'
    when p_moneda = 'USDT' then '1.1.01.002'
    else '2.1.03.004'  -- Depósitos bancarios por identificar (cuenta puente)
  end
$$;

-- Asiento de un EGRESO
create or replace function public.generar_asiento_egreso(p_egreso_id uuid)
returns uuid language plpgsql as $$
declare e record; a uuid; contra text; tot numeric; iva numeric; base numeric;
begin
  select * into e from public.egresos where id = p_egreso_id;
  if not found or not e.afecta_plan or e.cuenta_contable is null then return null; end if;

  tot := case when e.moneda = 'VES' and coalesce(e.tasa_cambio,0) > 0
              then round(e.monto / e.tasa_cambio, 2) else round(e.monto, 2) end;
  if coalesce(tot,0) = 0 then return null; end if;

  iva := case when e.iva_aplica and coalesce(e.iva_monto,0) > 0 then
              case when e.moneda = 'VES' and coalesce(e.tasa_cambio,0) > 0
                   then round(e.iva_monto / e.tasa_cambio, 2) else round(e.iva_monto, 2) end
         else 0 end;
  base := round(tot - iva, 2);
  contra := public.resolver_cuenta_tesoreria(e.moneda::text, e.metodo_pago, e.banco_origen);

  insert into public.asientos (fecha, descripcion, evento, origen_tipo, origen_id, estado, creado_por)
  values (e.fecha_egreso, left(coalesce(e.concepto,'Egreso'), 200), 'egreso', 'egreso', e.id, 'cuadrado', 'auto')
  on conflict (origen_tipo, origen_id, evento) where origen_id is not null do nothing
  returning id into a;
  if a is null then return null; end if;   -- ya existía (idempotente)

  insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, centro_costo_id, proveedor_id, nota)
  values (a, e.cuenta_contable, base, 0, 'USD', base, e.centro_costo_id, e.proveedor_id, e.cuenta_contable_nombre);

  if iva > 0 then
    insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, nota)
    values (a, '1.1.08.003', iva, 0, 'USD', iva, 'IVA crédito fiscal');
  end if;

  insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, banco, nota)
  values (a, contra, 0, tot, 'USD', tot, e.banco_origen, 'Contrapartida de pago');
  return a;
end $$;

-- Asiento de un INGRESO
create or replace function public.generar_asiento_ingreso(p_ingreso_id uuid)
returns uuid language plpgsql as $$
declare i record; a uuid; contra text; tot numeric; iva numeric; base numeric;
begin
  select * into i from public.ingresos where id = p_ingreso_id;
  if not found or not i.afecta_plan or i.cuenta_contable is null then return null; end if;

  tot := case when i.moneda = 'VES' and coalesce(i.tasa_cambio,0) > 0
              then round(i.monto / i.tasa_cambio, 2) else round(i.monto, 2) end;
  if coalesce(tot,0) = 0 then return null; end if;

  iva := case when i.iva_aplica and coalesce(i.iva_monto,0) > 0 then
              case when i.moneda = 'VES' and coalesce(i.tasa_cambio,0) > 0
                   then round(i.iva_monto / i.tasa_cambio, 2) else round(i.iva_monto, 2) end
         else 0 end;
  base := round(tot - iva, 2);
  contra := public.resolver_cuenta_tesoreria(i.moneda::text, i.metodo_pago, i.banco_receptor);

  insert into public.asientos (fecha, descripcion, evento, origen_tipo, origen_id, estado, creado_por)
  values (i.fecha_pago, left(coalesce(i.concepto,'Ingreso'), 200), 'ingreso', 'ingreso', i.id, 'cuadrado', 'auto')
  on conflict (origen_tipo, origen_id, evento) where origen_id is not null do nothing
  returning id into a;
  if a is null then return null; end if;

  insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, banco, nota)
  values (a, contra, tot, 0, 'USD', tot, i.banco_receptor, 'Contrapartida de cobro');

  insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, centro_costo_id, cliente_id, vehiculo_id, nota)
  values (a, i.cuenta_contable, 0, base, 'USD', base, i.centro_costo_id, i.cliente_id, i.vehiculo_id, i.cuenta_contable_nombre);

  if iva > 0 then
    insert into public.asiento_lineas (asiento_id, cuenta_codigo, debe, haber, moneda, equivalente_usd, nota)
    values (a, '2.1.05.005', 0, iva, 'USD', iva, 'IVA débito fiscal');
  end if;
  return a;
end $$;

-- Vista del MAYOR por cuenta (agregado en SQL, rápido). Solo asientos no anulados.
create or replace view public.v_mayor_cuenta as
select
  l.cuenta_codigo                              as codigo,
  split_part(l.cuenta_codigo, '.', 1)          as clase,
  count(*)                                     as n_lineas,
  round(sum(l.debe), 2)                        as total_debe,
  round(sum(l.haber), 2)                       as total_haber,
  round(sum(l.debe - l.haber), 2)              as saldo
from public.asiento_lineas l
join public.asientos a on a.id = l.asiento_id
where a.estado <> 'anulado'
group by l.cuenta_codigo;

-- Backfill: genera los asientos de todo lo ya registrado con cuenta contable.
do $$
declare r record;
begin
  for r in select id from public.egresos where afecta_plan and cuenta_contable is not null loop
    perform public.generar_asiento_egreso(r.id);
  end loop;
  for r in select id from public.ingresos where afecta_plan and cuenta_contable is not null loop
    perform public.generar_asiento_ingreso(r.id);
  end loop;
end $$;
