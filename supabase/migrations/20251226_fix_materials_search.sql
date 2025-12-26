-- Fix Materials Search Visibility and Schema
BEGIN;

-- 1. Ensure 'unit' column exists (used in Requisition frontend search)
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'EA';

-- 2. Enable RLS (if not already)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- 3. Cleanup existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Public Read Materials" ON public.materials;

-- 4. Create Permissive Policies for Materials
-- Read: All authenticated users (essential for search)
CREATE POLICY "Allow read access for authenticated users"
ON public.materials FOR SELECT
TO authenticated
USING (true);

-- Update: All authenticated users (for image uploads/edits)
CREATE POLICY "Allow update access for authenticated users"
ON public.materials FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert: All authenticated users (for creating new materials if needed)
CREATE POLICY "Allow insert access for authenticated users"
ON public.materials FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;
