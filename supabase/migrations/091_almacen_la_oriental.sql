-- 091_almacen_la_oriental.sql
-- Almacén La Oriental — inventario físico de repuestos en stock.
-- Qué guarda: los repuestos comprados a Vehimotor (SORE) y en compra en plaza
-- que NO van directo al taller, quedan inventariados aquí. Carga inicial del
-- inventario levantado por Ari (Ariel Matirado).
-- Acceso: Ari (arianna), José Manuel (taller) y Rojas (admin/director).
-- Salidas: transferencia a taller — La Oriental / Ki Auto / Autosurca — con bitácora.
-- Aplicar a AMBAS bases (La Oriental + Ki Auto).

-- Maestro de stock: una fila por repuesto distinto (con su cantidad on-hand).
create table if not exists public.almacen_items (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  referencia text,                          -- código / N° de parte
  marca text,                               -- MG | MAXUS | otro
  categoria text,
  cantidad numeric(14,2) not null default 0,-- stock actual
  ubicacion text,                           -- estante / gaveta
  costo_unitario numeric(14,2),
  moneda text not null default 'USD',
  stock_minimo numeric(14,2) not null default 0,
  notas text,
  activo boolean not null default true,
  concesionario_id text not null default 'la-oriental',
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bitácora de movimientos: entradas, salidas, transferencias a taller y ajustes.
create table if not exists public.almacen_movimientos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.almacen_items(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','transferencia','ajuste')),
  cantidad numeric(14,2) not null,          -- siempre positivo
  taller_destino text,                      -- la-oriental | ki-auto | autosurca (solo transferencia/salida)
  motivo text,
  solicitud_id uuid,                        -- SORE / compra en plaza de origen (si aplica)
  referencia_doc text,                      -- N° SORE, factura, etc.
  costo_unitario numeric(14,2),
  saldo_resultante numeric(14,2),           -- stock del ítem luego del movimiento
  usuario_id uuid,
  usuario_email text,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists almacen_items_activo_idx on public.almacen_items(activo);
create index if not exists almacen_items_ref_idx on public.almacen_items(referencia);
create index if not exists almacen_items_desc_idx on public.almacen_items(descripcion);
create index if not exists almacen_mov_item_idx on public.almacen_movimientos(item_id);
create index if not exists almacen_mov_fecha_idx on public.almacen_movimientos(created_at desc);

alter table public.almacen_items enable row level security;
alter table public.almacen_movimientos enable row level security;

-- Solo el staff gestiona el almacén; la escritura real se hace por server actions
-- con service role + gate de rol (Ari / José Manuel / Rojas).
drop policy if exists almacen_items_staff_all on public.almacen_items;
create policy almacen_items_staff_all on public.almacen_items
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());

drop policy if exists almacen_mov_staff_all on public.almacen_movimientos;
create policy almacen_mov_staff_all on public.almacen_movimientos
  for all to authenticated
  using (public.es_sesion_staff())
  with check (public.es_sesion_staff());

notify pgrst, 'reload schema';
