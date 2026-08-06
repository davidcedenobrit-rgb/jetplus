-- Anticipos de clientes: abonos/pagos que el cliente adelanta ANTES de que exista
-- una cotización o una venta. Viven como saldo del cliente hasta que se "asocian"
-- a una proforma/venta; al asociarse se convierten en ingreso formal (ligado al
-- vehículo) y descuentan del inicial pendiente. Trazable y sin recobrar.
create table if not exists public.anticipos (
  id             uuid primary key default uuid_generate_v4(),
  cliente_id     uuid not null references public.clientes(id) on delete restrict,
  monto          numeric(14,2) not null,             -- monto en la moneda registrada
  moneda         text not null default 'USD',        -- USD | VES | USDT
  tasa_cambio    numeric,                            -- tasa del día (si VES)
  monto_bs       numeric(14,2),                      -- monto en Bs (si VES)
  monto_usd      numeric(14,2) not null,             -- equivalente en USD (para asociar)
  saldo_usd      numeric(14,2) not null,             -- saldo disponible por asociar (USD)
  metodo_pago    text,
  banco_emisor   text,
  banco_receptor text,
  referencia     text,
  fecha_pago     date not null,
  concepto       text,
  observaciones  text,
  estado         text not null default 'disponible', -- disponible | parcial | aplicado | anulado
  registrado_por uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_anticipos_cliente on public.anticipos(cliente_id);
create index if not exists idx_anticipos_estado on public.anticipos(estado);

-- Vínculo del ingreso que nace al asociar un anticipo (trazabilidad).
alter table public.ingresos
  add column if not exists anticipo_id uuid references public.anticipos(id) on delete set null;
create index if not exists idx_ingresos_anticipo on public.ingresos(anticipo_id);

alter table public.anticipos enable row level security;
create policy anticipos_auth_all on public.anticipos
  for all to authenticated using (true) with check (true);
