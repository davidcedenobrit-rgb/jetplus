-- 027_contabilidad_base.sql
-- Capa contable (Fase 4 del plan maestro). Estructura base: plan de cuentas
-- versionado, dimensiones, partida doble (asientos/líneas), reglas y períodos.
--
-- IMPORTANTE (regla de Neyda): esta migración crea la ESTRUCTURA. El catálogo
-- NO se importa automáticamente: la importación se hace desde el módulo
-- "Contabilidad → Importar" en modo simulación y solo se aplica tras aprobación.
-- Aplicar esta migración a AMBAS bases (La Oriental y Ki Auto) cuando se apruebe.

-- ── Versiones del plan de cuentas ───────────────────────────────────
create table if not exists public.plan_cuentas_versiones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  fuente text,
  estado text not null default 'borrador' check (estado in ('borrador','aprobada','activa','archivada')),
  aprobada_por text,
  aprobada_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Plan de cuentas (por versión). Código como TEXTO. ───────────────
create table if not exists public.plan_cuentas (
  id uuid primary key default gen_random_uuid(),
  version_id uuid references public.plan_cuentas_versiones(id) on delete cascade,
  codigo text not null,
  codigo_original text,
  nombre text not null,
  clase text,
  nivel int,
  padre text,
  naturaleza text check (naturaleza in ('debe','haber')),
  naturaleza_propuesta text,
  tipo text not null default 'movimiento' check (tipo in ('titulo','movimiento')),
  acepta_movimientos boolean not null default true,
  estado_financiero text,
  requiere_centro_costo boolean not null default false,
  requiere_tercero boolean not null default false,
  requiere_vehiculo boolean not null default false,
  requiere_doc_fiscal boolean not null default false,
  origen text not null default 'importado' check (origen in ('importado','propuesta','manual')),
  estado text not null default 'pendiente' check (estado in ('activa','inactiva','pendiente')),
  observacion text,
  created_at timestamptz not null default now(),
  unique (version_id, codigo)
);
create index if not exists plan_cuentas_version_idx on public.plan_cuentas(version_id);
create index if not exists plan_cuentas_codigo_idx on public.plan_cuentas(codigo);

-- ── Dimensiones (centros_costo ya existe en 013) ────────────────────
create table if not exists public.origenes_ingreso (
  id text primary key, nombre text not null, activo boolean not null default true, orden int
);
create table if not exists public.unidades_negocio (
  id text primary key, nombre text not null, activo boolean not null default true, orden int
);
create table if not exists public.tipos_movimiento_contable (
  id text primary key, nombre text not null, activo boolean not null default true, orden int
);

-- ── Períodos contables (para cierre) ────────────────────────────────
create table if not exists public.periodos_contables (
  id uuid primary key default gen_random_uuid(),
  anio int not null,
  mes int not null,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado')),
  cerrado_por text,
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (anio, mes)
);

-- ── Reglas de contabilización (versionadas y configurables) ─────────
create table if not exists public.reglas_contabilizacion (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  descripcion text,
  definicion jsonb not null default '{}'::jsonb,
  version int not null default 1,
  activa boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Asientos (cabecera) + líneas (partida doble) ────────────────────
create table if not exists public.asientos (
  id uuid primary key default gen_random_uuid(),
  numero text,
  fecha date not null,
  descripcion text,
  evento text,                 -- evento operativo que lo originó
  origen_tipo text,            -- ingreso | egreso | manual | ...
  origen_id uuid,              -- id del registro origen (idempotencia)
  periodo_id uuid references public.periodos_contables(id),
  estado text not null default 'borrador' check (estado in ('borrador','cuadrado','contabilizado','anulado')),
  creado_por text,
  created_at timestamptz not null default now()
);
-- Idempotencia: un mismo evento sobre un mismo origen no genera dos asientos
create unique index if not exists asientos_origen_uidx
  on public.asientos(origen_tipo, origen_id, evento)
  where origen_id is not null;

create table if not exists public.asiento_lineas (
  id uuid primary key default gen_random_uuid(),
  asiento_id uuid not null references public.asientos(id) on delete cascade,
  cuenta_codigo text not null,
  debe numeric(16,2) not null default 0,
  haber numeric(16,2) not null default 0,
  -- dimensiones
  centro_costo_id text,
  origen_ingreso_id text,
  unidad_negocio_id text,
  -- auxiliares
  tercero text,
  cliente_id uuid,
  proveedor_id uuid,
  vehiculo_id uuid,
  credito_id uuid,
  cuota_id uuid,
  custodio text,
  banco text,
  documento_fiscal text,
  -- multimoneda (conserva monto original, moneda, tasa, fecha y equivalente)
  moneda text not null default 'USD',
  monto_original numeric(16,2),
  tasa numeric(16,4),
  fecha_tasa date,
  equivalente_usd numeric(16,2),
  nota text,
  created_at timestamptz not null default now()
);
create index if not exists asiento_lineas_asiento_idx on public.asiento_lineas(asiento_id);
create index if not exists asiento_lineas_cuenta_idx on public.asiento_lineas(cuenta_codigo);

-- ── Log de importaciones/simulaciones del catálogo ──────────────────
create table if not exists public.catalogo_importaciones (
  id uuid primary key default gen_random_uuid(),
  version_id uuid references public.plan_cuentas_versiones(id),
  modo text not null default 'simulacion' check (modo in ('simulacion','aplicada')),
  total int,
  insertadas int,
  advertencias int,
  resumen jsonb,
  ejecutado_por text,
  created_at timestamptz not null default now()
);

-- ── Semillas de dimensiones ─────────────────────────────────────────
insert into public.origenes_ingreso (id,nombre,orden) values
 ('comision_vehiculos','Comisión por venta de vehículos',1),
 ('venta_vehiculo_propio','Venta de vehículo propio',2),
 ('repuestos','Venta de repuestos',3),
 ('accesorios','Venta de accesorios',4),
 ('servicio_taller','Servicio técnico / taller',5),
 ('autolavado','Autolavado',6),
 ('intereses_financiamiento','Intereses de financiamiento propio',7),
 ('otros','Otros ingresos',99)
on conflict (id) do nothing;

insert into public.unidades_negocio (id,nombre,orden) values
 ('vehiculos','Venta de vehículos',1),
 ('taller_marca','Taller de marca',2),
 ('taller_multimarca','Taller multimarca',3),
 ('repuestos_accesorios','Repuestos y accesorios',4),
 ('autolavado','Autolavado',5)
on conflict (id) do nothing;

insert into public.tipos_movimiento_contable (id,nombre,orden) values
 ('ingreso_propio','Ingreso propio',1),
 ('fondo_tercero','Fondo de tercero (custodia)',2),
 ('gasto','Gasto',3),
 ('costo','Costo',4),
 ('inversion','Inversión',5),
 ('transferencia','Transferencia interna',6),
 ('cxc','Cuenta por cobrar',7),
 ('cxp','Cuenta por pagar',8)
on conflict (id) do nothing;

-- ── RLS: habilitado SIN política para authenticated → solo service_role accede ──
-- Estas tablas contienen datos financieros/contables sensibles (libro mayor,
-- asientos, plan de cuentas). La app las lee/escribe únicamente vía service-role
-- después de la guarda de rol super-admin en páginas y acciones; ningún usuario
-- autenticado puede consultarlas directamente con la llave anon. Cuando se
-- necesite exponer un catálogo puntual (ej. dimensiones para un selector) se
-- agregará una política específica y acotada, no un `using (true)` general.
do $$
declare t text;
begin
  foreach t in array array[
    'plan_cuentas_versiones','plan_cuentas','origenes_ingreso','unidades_negocio',
    'tipos_movimiento_contable','periodos_contables','reglas_contabilizacion',
    'asientos','asiento_lineas','catalogo_importaciones'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_sel', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
  end loop;
end $$;
