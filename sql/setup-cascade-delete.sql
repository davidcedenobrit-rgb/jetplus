-- =============================================
-- Configurar CASCADE DELETE en foreign keys
-- Para que al eliminar un cliente se eliminen
-- sus vehículos, créditos, cuotas, ingresos, etc.
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- vehiculos → clientes
ALTER TABLE public.vehiculos DROP CONSTRAINT IF EXISTS vehiculos_cliente_id_fkey;
ALTER TABLE public.vehiculos ADD CONSTRAINT vehiculos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- creditos → clientes
ALTER TABLE public.creditos DROP CONSTRAINT IF EXISTS creditos_cliente_id_fkey;
ALTER TABLE public.creditos ADD CONSTRAINT creditos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- creditos → vehiculos
ALTER TABLE public.creditos DROP CONSTRAINT IF EXISTS creditos_vehiculo_id_fkey;
ALTER TABLE public.creditos ADD CONSTRAINT creditos_vehiculo_id_fkey
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE CASCADE;

-- cuotas → creditos
ALTER TABLE public.cuotas DROP CONSTRAINT IF EXISTS cuotas_credito_id_fkey;
ALTER TABLE public.cuotas ADD CONSTRAINT cuotas_credito_id_fkey
  FOREIGN KEY (credito_id) REFERENCES public.creditos(id) ON DELETE CASCADE;

-- ingresos → clientes (si existe la FK)
ALTER TABLE public.ingresos DROP CONSTRAINT IF EXISTS ingresos_cliente_id_fkey;
ALTER TABLE public.ingresos ADD CONSTRAINT ingresos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- ingresos → vehiculos (si existe la FK)
ALTER TABLE public.ingresos DROP CONSTRAINT IF EXISTS ingresos_vehiculo_id_fkey;
ALTER TABLE public.ingresos ADD CONSTRAINT ingresos_vehiculo_id_fkey
  FOREIGN KEY (vehiculo_id) REFERENCES public.vehiculos(id) ON DELETE SET NULL;

-- archivos → ingresos
ALTER TABLE public.archivos DROP CONSTRAINT IF EXISTS archivos_ingreso_id_fkey;
ALTER TABLE public.archivos ADD CONSTRAINT archivos_ingreso_id_fkey
  FOREIGN KEY (ingreso_id) REFERENCES public.ingresos(id) ON DELETE CASCADE;

-- archivos → egresos
ALTER TABLE public.archivos DROP CONSTRAINT IF EXISTS archivos_egreso_id_fkey;
ALTER TABLE public.archivos ADD CONSTRAINT archivos_egreso_id_fkey
  FOREIGN KEY (egreso_id) REFERENCES public.egresos(id) ON DELETE CASCADE;
