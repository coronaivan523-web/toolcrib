-- Supabase Migration: 20260302_rls_hardening_multi_plant.sql
-- Description: HC-3 Phase 3 - Strict Plant Isolation

-- 1. Asegurar que RLS esté activo
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas actuales abiertas/permisivas
-- (Nombres basados en nuestra última auditoría estructural)
DROP POLICY IF EXISTS "Authenticated can view materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can view movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated can create movements" ON public.inventory_movements;
-- Otras relacionadas si aplica
DROP POLICY IF EXISTS "Enable read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_movements;

-- 3. Crear POLÍTICAS PLANT ISOLATION (READ)
CREATE POLICY plant_isolation_materials
ON public.materials
FOR SELECT
USING (plant = auth.jwt() ->> 'plant');

CREATE POLICY plant_isolation_movements
ON public.inventory_movements
FOR SELECT
USING (plant = auth.jwt() ->> 'plant');

-- 4. POLÍTICAS INSERT/UPDATE CONTROLADAS (WRITE)
CREATE POLICY plant_insert_movements
ON public.inventory_movements
FOR INSERT
WITH CHECK (plant = auth.jwt() ->> 'plant');

-- (Requisito para update de admin será añadido en HC-3 Fase 4 o post-operaciones si aplica)
