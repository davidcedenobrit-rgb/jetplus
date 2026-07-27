-- Fase 2: Acuerdo de Responsabilidad de Gestión de Cobro y Condición de Pago
-- de Comisión. Aplica SOLO cuando La Oriental financia parte de la inicial
-- (doble financiamiento). Va ligado a la cotización; la vendedora asume el
-- cobro de esas cuotas y su comisión se paga cuando el cliente termine de
-- pagar el monto financiado. Rojas marca la aceptación en el panel, y ese
-- acuerdo (aceptado) + la cotización aprobada por el cliente habilitan la
-- creación de la proforma.

create table if not exists acuerdos_cobro (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references cotizaciones(id) on delete cascade,

  -- Doble financiamiento de la inicial
  inicial_total     numeric,   -- inicial total del vehículo
  monto_contado     numeric,   -- pagado de contado por el cliente
  monto_financiado  numeric,   -- financiado por La Oriental (saldo de la inicial)
  num_cuotas        integer,   -- nº de cuotas del financiamiento de la inicial
  cuota_monto       numeric,   -- monto de cada cuota
  plan_cuotas       text,      -- descripción libre del plan de cuotas

  -- Vendedora(s) responsables del cobro (solo se listan)
  vendedoras jsonb,            -- [{ codigo, nombre }]

  -- Aceptación (Rojas la marca en el panel)
  estado text not null default 'pendiente',  -- pendiente | aceptado | rechazado
  aceptado_por uuid,
  aceptado_at  timestamptz,

  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un acuerdo por cotización.
create unique index if not exists acuerdos_cobro_cotizacion_uidx
  on acuerdos_cobro(cotizacion_id);
