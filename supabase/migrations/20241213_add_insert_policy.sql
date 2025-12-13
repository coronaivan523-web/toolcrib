-- Migration: Add RLS Policy for Inserting Materials
-- Description: Allows authenticated users to insert new rows into the 'materials' table.

-- Enable RLS on the table (ensure it's on)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policy: "Enable insert for authenticated users only"
-- Adjust 'authenticated' to 'anon' if you want public access, but usually 'authenticated' is preferred.
CREATE POLICY "Enable insert for authenticated users only" ON public.materials
FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Verify checks if needed (e.g., auth.uid() == created_by)

-- Optional: If you want to enforce that users can only create materials where they are the 'created_by'
-- CREATE POLICY "Enable insert for owners" ON public.materials
-- FOR INSERT TO authenticated
-- WITH CHECK (auth.uid() = created_by);
