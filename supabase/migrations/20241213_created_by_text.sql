-- Add created_by column to materials table
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS created_by text;

-- Optional: If you want to backfill existing records or registered_by, you can do it here.
-- For now, we just add the column.
