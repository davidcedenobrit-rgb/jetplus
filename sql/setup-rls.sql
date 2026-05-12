-- =============================================
-- RLS Policies para La Oriental Finanzas
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos ENABLE ROW LEVEL SECURITY;

-- CLIENTES
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- VEHICULOS
CREATE POLICY "vehiculos_select" ON public.vehiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehiculos_insert" ON public.vehiculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vehiculos_update" ON public.vehiculos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- INGRESOS
CREATE POLICY "ingresos_select" ON public.ingresos FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingresos_insert" ON public.ingresos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ingresos_update" ON public.ingresos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- EGRESOS
CREATE POLICY "egresos_select" ON public.egresos FOR SELECT TO authenticated USING (true);
CREATE POLICY "egresos_insert" ON public.egresos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "egresos_update" ON public.egresos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CREDITOS
CREATE POLICY "creditos_select" ON public.creditos FOR SELECT TO authenticated USING (true);
CREATE POLICY "creditos_insert" ON public.creditos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "creditos_update" ON public.creditos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CUOTAS
CREATE POLICY "cuotas_select" ON public.cuotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "cuotas_insert" ON public.cuotas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cuotas_update" ON public.cuotas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ARCHIVOS
CREATE POLICY "archivos_select" ON public.archivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "archivos_insert" ON public.archivos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "archivos_update" ON public.archivos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
