-- Add last_counted_at to materials for Cycle Count Planning
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS last_counted_at timestamptz;

-- Notify Request to reload schema
NOTIFY pgrst, 'reload schema';
