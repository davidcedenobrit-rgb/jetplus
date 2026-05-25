-- Campos para el flujo de envío a depósito y confirmación
alter table ingresos
  add column if not exists enviado_deposito_responsable text,          -- con quién José envió el dinero (ej: "Ari")
  add column if not exists deposito_referencia          text,          -- N° referencia bancaria (lo llena Ari al depositar)
  add column if not exists deposito_banco               text,          -- banco receptor del depósito (lo llena Ari)
  add column if not exists depositado_at                timestamptz;   -- cuándo se confirmó el depósito
