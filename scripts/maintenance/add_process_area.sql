-- Add process_area column to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS process_area TEXT;
