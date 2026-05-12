-- =============================================
-- Políticas DELETE para todas las tablas
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated USING (true);
CREATE POLICY "vehiculos_delete" ON public.vehiculos FOR DELETE TO authenticated USING (true);
CREATE POLICY "ingresos_delete" ON public.ingresos FOR DELETE TO authenticated USING (true);
CREATE POLICY "egresos_delete" ON public.egresos FOR DELETE TO authenticated USING (true);
CREATE POLICY "creditos_delete" ON public.creditos FOR DELETE TO authenticated USING (true);
CREATE POLICY "cuotas_delete" ON public.cuotas FOR DELETE TO authenticated USING (true);
CREATE POLICY "archivos_delete" ON public.archivos FOR DELETE TO authenticated USING (true);
CREATE POLICY "planes_ac500_delete" ON public.planes_ac500 FOR DELETE TO authenticated USING (true);

-- =============================================
-- Fix: constraint de tipo_compra en vehiculos
-- (si aún no lo has ejecutado)
-- =============================================
ALTER TABLE public.vehiculos DROP CONSTRAINT IF EXISTS vehiculos_tipo_compra_check;
ALTER TABLE public.vehiculos ADD CONSTRAINT vehiculos_tipo_compra_check CHECK (tipo_compra IN ('contado', 'financiado'));
UPDATE public.vehiculos SET tipo_compra = 'financiado' WHERE tipo_compra IN ('credito', 'financiamiento');
