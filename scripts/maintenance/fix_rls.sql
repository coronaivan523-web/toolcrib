-- Copy and paste this into Supabase SQL Editor

-- 1. Enable RLS on materials (if not already)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 2. Allow ALL authenticated users to VIEW materials
DROP POLICY IF EXISTS "Enable read access for all active users" ON materials;
CREATE POLICY "Enable read access for all active users" 
ON materials FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Allow ALL authenticated users to INSERT materials
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials;
CREATE POLICY "Enable insert for authenticated users" 
ON materials FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow ALL authenticated users to UPDATE materials
DROP POLICY IF EXISTS "Enable update for authenticated users" ON materials;
CREATE POLICY "Enable update for authenticated users" 
ON materials FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 5. Fix Locations as well just in case
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Locations viewable by authenticated users" ON locations;
CREATE POLICY "Locations viewable by authenticated users" 
ON locations FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Locations insertable by authenticated users" ON locations;
CREATE POLICY "Locations insertable by authenticated users" 
ON locations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
