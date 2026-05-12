-- =============================================
-- Tabla y datos del Plan Asegúrate con $500
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.planes_ac500 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  marca text NOT NULL,
  modelo text NOT NULL,
  meses int NOT NULL CHECK (meses IN (6, 9)),
  cuota_0 numeric(12,2) NOT NULL DEFAULT 500,
  cuota_1 numeric(12,2) NOT NULL,
  cuota_2 numeric(12,2) NOT NULL,
  cuota_3 numeric(12,2) NOT NULL,
  cuota_4 numeric(12,2) NOT NULL,
  cuota_5 numeric(12,2) NOT NULL,
  cuota_6 numeric(12,2) NOT NULL DEFAULT 0,
  cuota_7 numeric(12,2) NOT NULL DEFAULT 0,
  cuota_8 numeric(12,2) NOT NULL DEFAULT 0,
  cuota_9 numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.planes_ac500 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planes_ac500_select" ON public.planes_ac500 FOR SELECT TO authenticated USING (true);
CREATE POLICY "planes_ac500_insert" ON public.planes_ac500 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "planes_ac500_update" ON public.planes_ac500 FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- MODALIDAD 6 MESES
-- =============================================
INSERT INTO public.planes_ac500 (marca, modelo, meses, cuota_0, cuota_1, cuota_2, cuota_3, cuota_4, cuota_5, cuota_6, total) VALUES
('MG', 'MG5 1,5L MT STD', 6, 500, 4497, 3747, 3747, 2248, 751, 3248, 18738),
('MG', 'MG5 1,5L CVT COM', 6, 500, 5637, 4697, 4697, 2818, 941, 3970, 23260),
('MG', 'MG3 1,5L MT STD', 6, 500, 4605, 3837, 3837, 2302, 770, 3317, 19168),
('MG', 'MG3 1,5L AT STD', 6, 500, 5322, 4435, 4435, 2661, 887, 3771, 22011),
('MG', 'ZS 1,5L MT COM', 6, 500, 6516, 5430, 5430, 3258, 1086, 4527, 26747),
('MG', 'ZS 1,5L AT COM', 6, 500, 6657, 5547, 5547, 3328, 1111, 4616, 27306),
('MG', 'RX5 1,5T DCT 7', 6, 500, 7575, 6312, 6312, 3787, 1265, 5198, 30949),
('MG', 'RX9 2,0T AT 4WD', 6, 500, 11997, 9997, 9997, 5999, 2000, 7998, 48488),
('MAXUS', 'D90 4X4 AT LUX', 6, 500, 13559, 10883, 10883, 6530, 2177, 8671, 53203),
('MAXUS', 'T60 Comfort 4x4 GASOLINA', 6, 500, 6597, 5498, 5498, 3299, 1100, 4778, 27270),
('MAXUS', 'T60 Comfort 4x2 GASOLINA', 6, 500, 5814, 4845, 4845, 2907, 969, 4282, 24162),
('MAXUS', 'T90 4X4 AT Double Exe. Lux Gasolina', 6, 500, 9504, 7920, 7920, 4752, 1584, 6619, 38799),
('MAXUS', 'S80 1,9L Diesel/Chasis', 6, 500, 4380, 3650, 3650, 2190, 730, 3374, 24474),
('MAXUS', 'C300 Chasis', 6, 500, 6663, 5553, 5553, 3332, 1111, 4820, 27532);

-- =============================================
-- MODALIDAD 9 MESES
-- =============================================
INSERT INTO public.planes_ac500 (marca, modelo, meses, cuota_0, cuota_1, cuota_2, cuota_3, cuota_4, cuota_5, cuota_6, cuota_7, cuota_8, cuota_9, total) VALUES
('MG', 'MG5 1,5L MT STD', 9, 500, 3115, 3115, 3115, 1482, 1482, 1482, 1482, 1482, 1482, 18737),
('MG', 'MG5 1,5L CVT COM', 9, 500, 3886, 3886, 3886, 1850, 1850, 1850, 1850, 1850, 1850, 23258),
('MG', 'MG3 1,5L MT STD', 9, 500, 3183, 3183, 3183, 1520, 1520, 1520, 1520, 1520, 1520, 19169),
('MG', 'MG3 1,5L AT STD', 9, 500, 3635, 3635, 3635, 1768, 1768, 1768, 1768, 1768, 1768, 22013),
('MG', 'NEW MG ZS AT LUX', 9, 500, 4925, 4925, 4925, 2348, 2348, 2348, 2348, 2348, 2348, 29363),
('MG', 'NEW MG ZS AT STD', 9, 500, 4288, 4288, 4288, 2125, 2125, 2125, 2125, 2125, 2125, 26114),
('MG', 'NEW MG ZS MT COM', 9, 500, 4422, 4422, 4422, 2163, 2163, 2163, 2163, 2163, 2163, 26744),
('MG', 'NEW MG ZS AT COM', 9, 500, 4523, 4523, 4523, 2206, 2206, 2206, 2206, 2206, 2206, 27305),
('MG', 'RX5 1,5T DCT 7', 9, 500, 5194, 5194, 5194, 2478, 2478, 2478, 2478, 2478, 2478, 30950),
('MG', 'RX9 COM 2WD', 9, 500, 7539, 7539, 7539, 3355, 3355, 3355, 3355, 3355, 3355, 43247),
('MG', 'RX9 LUX 4WD', 9, 500, 8545, 8545, 8545, 3726, 3726, 3726, 3726, 3726, 3726, 48491),
('MAXUS', 'D90 4X4 AT LUX', 9, 500, 9200, 8700, 4350, 4350, 4350, 4350, 4350, 4350, 4350, 53200),
('MAXUS', 'D60 LUX', 9, 500, 6030, 6030, 6030, 2774, 2774, 2774, 2774, 2774, 2774, 35234),
('MAXUS', 'T60 Comfort 4x4 GASOLINA', 9, 500, 4441, 4441, 4441, 2241, 2241, 2241, 2241, 2241, 2241, 27269),
('MAXUS', 'T60 Comfort 4x2 GASOLINA', 9, 500, 4105, 4105, 4105, 1891, 1891, 1891, 1891, 1891, 1891, 24161),
('MAXUS', 'T90 4X4 AT Double Exe. Lux Gasolina', 9, 500, 6383, 6383, 6383, 3192, 3192, 3192, 3192, 3192, 3192, 38801),
('MAXUS', 'S80 1,9L Diesel/Chasis', 9, 500, 2929, 2929, 2929, 1531, 1531, 1531, 1531, 1531, 1531, 18473),
('MAXUS', 'C300 Chasis', 9, 500, 4491, 4491, 4491, 2259, 2259, 2259, 2259, 2259, 2259, 27527),
('MG', 'MC Cybester', 9, 500, 17433, 17433, 17433, 9200, 9200, 9200, 9200, 9200, 9200, 107999),
('MAXUS', 'G10 Van Gasolina', 9, 500, 6176, 6176, 6176, 2912, 2912, 2912, 2912, 2912, 2912, 36500),
('MAXUS', 'G10 Pasajero Gasolina', 9, 500, 6501, 6501, 6501, 3037, 3037, 3037, 3037, 3037, 3037, 38225),
('MG', 'MG4 URBAN COM', 9, 500, 5831, 5831, 5831, 2746, 2746, 2746, 2746, 2746, 2746, 34469);
