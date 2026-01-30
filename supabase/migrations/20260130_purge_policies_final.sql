-- SURGICAL POLICY PURGE (Based on Diagnostic RPC Results)
-- This script explicitly drops the permissive policies found on the system.

BEGIN;

-- --------------------------------------------------------
-- 1. PURGE "materials" (Currently has 6 policies, 2 are permissive)
-- --------------------------------------------------------
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY; -- Briefly disable to reset

-- Explicitly drop the rogue policies found by diagnostics:
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Allow update access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.materials;

-- Also drop our own previous attempts to avoid duplicates if names match
DROP POLICY IF EXISTS "Authenticated can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
DROP POLICY IF EXISTS "Supervisors can update materials" ON public.materials;

-- RE-APPLY HARDENING (Strict Admin/Supervisor Only)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view materials" ON public.materials
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert materials" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Admins can update materials" ON public.materials
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Admins can delete materials" ON public.materials
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- --------------------------------------------------------
-- 2. PURGE "inventory_movements" (Has "Enable all access...")
-- --------------------------------------------------------
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;

-- Drop the rogue permissive policy:
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inventory_movements;

-- Drop verify others to be clean
DROP POLICY IF EXISTS "Authenticated can create movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated can view movements" ON public.inventory_movements;

-- RE-APPLY KARDEX HARDENING (Insert-Only)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can create movements" ON public.inventory_movements
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view movements" ON public.inventory_movements
FOR SELECT TO authenticated USING (true);

-- NO UPDATE/DELETE policies = Immutable.

COMMIT;
