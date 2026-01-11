-- Ensure plant column exists in materials table and reload schema cache
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS plant text DEFAULT 'Planta 1';

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
