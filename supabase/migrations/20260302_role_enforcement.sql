-- Supabase Migration: 20260302_role_enforcement.sql
-- Description: HC-4 Fase 2 - Role RLS Enforcement on Inventory

-- Drop legacy isolation policies (HC-3 Fase 3) to upgrade them
DROP POLICY IF EXISTS "plant_insert_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "plant_isolation_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "plant_isolation_materials" ON public.materials;

-- NEW RLS FOR inventory_movements
-- Read (SELECT): Any authenticated user of the same plant can see movements
CREATE POLICY role_select_movements
ON public.inventory_movements
FOR SELECT
USING (
  plant = auth.jwt() ->> 'plant'
);

-- Write (INSERT/UPDATE): Only authorized roles from the same plant
CREATE POLICY role_insert_movements
ON public.inventory_movements
FOR INSERT
WITH CHECK (
  plant = auth.jwt() ->> 'plant'
  AND (auth.jwt() ->> 'role') IN ('Supervisor', 'Toolroom', 'Admin', 'supervisor', 'toolroom_staff', 'admin', 'manager')
);

CREATE POLICY role_update_movements
ON public.inventory_movements
FOR UPDATE
USING (
  plant = auth.jwt() ->> 'plant'
  AND (auth.jwt() ->> 'role') IN ('Supervisor', 'Toolroom', 'Admin', 'supervisor', 'toolroom_staff', 'admin', 'manager')
);

-- NEW RLS FOR materials
CREATE POLICY role_select_materials
ON public.materials
FOR SELECT
USING (
  plant = auth.jwt() ->> 'plant'
);

CREATE POLICY role_insert_materials
ON public.materials
FOR INSERT
WITH CHECK (
  plant = auth.jwt() ->> 'plant'
  AND (auth.jwt() ->> 'role') IN ('Supervisor', 'Toolroom', 'Admin', 'supervisor', 'toolroom_staff', 'admin', 'manager')
);

CREATE POLICY role_update_materials
ON public.materials
FOR UPDATE
USING (
  plant = auth.jwt() ->> 'plant'
  AND (auth.jwt() ->> 'role') IN ('Supervisor', 'Toolroom', 'Admin', 'supervisor', 'toolroom_staff', 'admin', 'manager')
);

-- FASE C: RPC HARDENING (Revertir SECURITY DEFINER)
-- Al convertirlos en SECURITY INVOKER, PostgreSQL los obliga a correr bajo 
-- el contexto de sesión del llamante (JWT User) y atravesar las políticas RLS.
ALTER FUNCTION public.confirm_initial_inventory(BIGINT, INTEGER, TEXT) SECURITY INVOKER;

-- Ajustes preventivos para RPCs conocidos
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.atomic_inventory_movement_v1(bigint, integer, uuid, text) SECURITY INVOKER;
  EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    ALTER FUNCTION public.process_ledger_movement(jsonb) SECURITY INVOKER;
  EXCEPTION WHEN OTHERS THEN END;
END $$;

